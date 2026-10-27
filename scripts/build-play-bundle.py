#!/usr/bin/env python3
"""Build a signed, test-ad-only Google Play internal bundle without logging credentials."""
import argparse
import base64
import hashlib
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET
from zipfile import ZipFile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--verify-only', action='store_true', help='Verify and refresh downloads from the existing internal bundle without rebuilding')
parser.add_argument('--no-downloads', action='store_true', help='Keep verified outputs under ignored Android build directories, leaving tracked downloads unchanged')
arguments = parser.parse_args()

ROOT = Path(__file__).resolve().parents[1]
environment = os.environ.copy()
settings = Path(environment.get('LMA_SIGNING_CONFIG', '/workspace/.tools/lma-signing/signing.json'))
if not any(environment.get(name) for name in ['LMA_UPLOAD_KEYSTORE', 'LMA_UPLOAD_STORE_PASSWORD', 'LMA_UPLOAD_KEY_ALIAS', 'LMA_UPLOAD_KEY_PASSWORD']) and settings.is_file():
    with settings.open() as stream:
        config = json.load(stream)
    for variable, key in [('LMA_UPLOAD_KEYSTORE', 'keystore'), ('LMA_UPLOAD_STORE_PASSWORD', 'storePassword'), ('LMA_UPLOAD_KEY_ALIAS', 'alias'), ('LMA_UPLOAD_KEY_PASSWORD', 'keyPassword')]:
        environment.setdefault(variable, str(config[key]))
required = ['LMA_UPLOAD_KEYSTORE', 'LMA_UPLOAD_STORE_PASSWORD', 'LMA_UPLOAD_KEY_ALIAS', 'LMA_UPLOAD_KEY_PASSWORD']
missing = [name for name in required if not environment.get(name)]
if missing:
    sys.exit('Missing secure signing configuration: ' + ', '.join(missing) + '. Never put passwords in command-line arguments or Git.')
if not Path(environment['LMA_UPLOAD_KEYSTORE']).is_file():
    sys.exit('The configured upload keystore file does not exist.')

# The cloud image retains these tools. Normal local/CI JAVA_HOME and SDK settings win.
for variable, path in [('JAVA_HOME', '/workspace/.tools/jdk'), ('ANDROID_HOME', '/workspace/.tools/android-sdk'), ('ANDROID_USER_HOME', '/workspace/.tools/android-user'), ('GRADLE_USER_HOME', '/workspace/.tools/gradle-cache')]:
    if variable not in environment and Path(path).exists():
        environment[variable] = path
if Path('/etc/codex/network-policy.json').exists():
    options = environment.get('JAVA_TOOL_OPTIONS', '')
    environment['JAVA_TOOL_OPTIONS'] = options + ' -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts -Duser.home=/workspace/.tools/java-user'

command = [str(ROOT / 'android' / ('gradlew.bat' if os.name == 'nt' else 'gradlew')), '--no-daemon']
proxy = urlsplit(environment.get('HTTPS_PROXY', environment.get('https_proxy', '')))
if proxy.scheme == 'http' and proxy.hostname:
    for protocol in ['http', 'https']:
        command += [f'-D{protocol}.proxyHost={proxy.hostname}', f'-D{protocol}.proxyPort={proxy.port or 80}']
command += ['bundleInternal', 'lintInternal']
if not arguments.verify_only:
    print('Building signed internal bundle with Google test ads. Signing values will not be printed.', flush=True)
    result = subprocess.run(command, cwd=ROOT / 'android', env=environment)
    if result.returncode:
        sys.exit(result.returncode)

bundle = ROOT / 'android/app/build/outputs/bundle/internal/app-internal.aab'
if not bundle.is_file():
    sys.exit('Build did not produce the expected internal AAB.')
lint_report = ROOT / 'android/app/build/reports/lint-results-internal.xml'
if not lint_report.is_file():
    sys.exit('Internal lint report is missing. Run the full build before verifying.')
issues = ET.parse(lint_report).getroot().findall('issue')
if any(issue.get('severity') in ['Error', 'Fatal'] for issue in issues):
    sys.exit('Internal Android lint has unresolved errors. No download was refreshed.')
inputs = list((ROOT / 'android/app/src/main').rglob('*')) + [ROOT / 'android/app/build.gradle', ROOT / 'android/build.gradle']
if arguments.verify_only and any(path.is_file() and path.stat().st_mtime > lint_report.stat().st_mtime for path in inputs):
    sys.exit('Internal lint report is stale. Run the full build before verifying.')
java_bin = Path(environment['JAVA_HOME']) / 'bin' if environment.get('JAVA_HOME') else None
jarsigner = str(java_bin / 'jarsigner') if java_bin else 'jarsigner'
verified = subprocess.run([jarsigner, '-J-Duser.language=en', '-verify', str(bundle)], capture_output=True, text=True)
if verified.returncode or 'jar verified' not in verified.stdout.lower():
    sys.exit('AAB signature verification failed. No downloadable artifact was updated.')

manifests = list((ROOT / 'android/app/build/intermediates/merged_manifests/internal').rglob('AndroidManifest.xml'))
if not manifests:
    sys.exit('Merged manifest is missing; cannot validate the Play build.')
manifest = ET.parse(manifests[0]).getroot()
android = '{http://schemas.android.com/apk/res/android}'
assert manifest.get('package') == 'com.littlematch.adventure', 'Unexpected Play app package'
assert manifest.find('uses-sdk').get(android + 'targetSdkVersion') == '36', 'Unexpected target SDK'
assert manifest.find('application').get(android + 'debuggable', 'false') == 'false', 'A Play bundle must not be debuggable'
with ZipFile(bundle) as archive:
    names = archive.namelist()
    for name in names:
        if not name.endswith('/'):
            content = archive.read(name)
            assert environment['LMA_UPLOAD_STORE_PASSWORD'].encode() not in content, 'Signing secret unexpectedly present in bundle'
            assert environment['LMA_UPLOAD_KEY_PASSWORD'].encode() not in content, 'Signing secret unexpectedly present in bundle'
    assert 'BundleConfig.pb' in names and 'base/manifest/AndroidManifest.xml' in names, 'Invalid bundle structure'
    for name in ['index.html', 'app.js', 'style.css', 'translations.js', 'audio.js', 'ads.js']:
        assert archive.read('base/assets/www/' + name) == (ROOT / name).read_bytes(), 'Stale game source: ' + name
    packed_manifest = archive.read('base/manifest/AndroidManifest.xml')
    assert b'ca-app-pub-3940256099942544~3347511713' in packed_manifest, 'Internal bundle must use the Google test app ID'
    dex = b''.join(archive.read(name) for name in names if name.endswith('.dex'))
    assert b'ca-app-pub-3940256099942544/1033173712' in dex, 'Missing test interstitial ID'
    assert b'ca-app-pub-3940256099942544/5224354917' in dex, 'Missing test rewarded ID'
    assert b'ca-app-pub-9967525901358281' not in dex + packed_manifest, 'Live ad IDs must not enter the tester bundle'

output = ROOT / 'android/app/build/verified' if arguments.no_downloads else ROOT / 'downloads'
output.mkdir(parents=True, exist_ok=True)
final = output / 'little-match-adventure-internal.aab'
keytool = str(java_bin / 'keytool') if java_bin else 'keytool'
certificate = output / 'upload-certificate.pem'
export = subprocess.run([keytool, '-exportcert', '-rfc', '-keystore', environment['LMA_UPLOAD_KEYSTORE'], '-alias', environment['LMA_UPLOAD_KEY_ALIAS'], '-storepass:env', 'LMA_UPLOAD_STORE_PASSWORD', '-file', str(certificate)], env=environment, capture_output=True, text=True)
if export.returncode:
    sys.exit('Bundle signed, but public upload certificate export failed.')
signer = subprocess.run([keytool, '-J-Duser.language=en', '-printcert', '-jarfile', str(bundle)], capture_output=True, text=True)
match = re.search(r'SHA256:\s*([0-9A-Fa-f:]+)', signer.stdout)
encoded = ''.join(line for line in certificate.read_text().splitlines() if not line.startswith('---'))
expected_signer = hashlib.sha256(base64.b64decode(encoded)).hexdigest()
if signer.returncode or not match or match.group(1).replace(':', '').lower() != expected_signer:
    sys.exit('Bundle signer does not match the expected upload certificate. No download was refreshed.')
shutil.copyfile(bundle, final)
checksums = []
for artifact in sorted(output.iterdir()):
    if artifact.suffix in ['.apk', '.aab']:
        checksums.append(hashlib.sha256(artifact.read_bytes()).hexdigest() + '  ' + artifact.name)
(output / 'SHA256SUMS').write_text('\n'.join(checksums) + '\n')
print('PASS: signed AAB, package com.littlematch.adventure, target API 36, non-debuggable, Google test ads only, exact game assets.')
print('Play upload file:', final.relative_to(ROOT))
print('Public upload certificate:', certificate.relative_to(ROOT))
print('Private key and signing passwords remain outside the repository.')
