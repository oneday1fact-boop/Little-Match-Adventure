const CACHE = "little-match-v2-1";
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./audio.js",
  "./ads.js",
  "./translations.js",
  "./manifest.webmanifest",
  "./assets/animals/bear.svg",
  "./assets/animals/cat.svg",
  "./assets/animals/chick.svg",
  "./assets/animals/cow.svg",
  "./assets/animals/crab.svg",
  "./assets/animals/crocodile.svg",
  "./assets/animals/deer.svg",
  "./assets/animals/dog.svg",
  "./assets/animals/elephant.svg",
  "./assets/animals/fish.svg",
  "./assets/animals/fox.svg",
  "./assets/animals/giraffe.svg",
  "./assets/animals/hedgehog.svg",
  "./assets/animals/hippo.svg",
  "./assets/animals/horse.svg",
  "./assets/animals/lion.svg",
  "./assets/animals/monkey.svg",
  "./assets/animals/octopus.svg",
  "./assets/animals/owl.svg",
  "./assets/animals/parrot.svg",
  "./assets/animals/penguin.svg",
  "./assets/animals/pig.svg",
  "./assets/animals/rabbit.svg",
  "./assets/animals/raccoon.svg",
  "./assets/animals/seahorse.svg",
  "./assets/animals/seal.svg",
  "./assets/animals/sheep.svg",
  "./assets/animals/squirrel.svg",
  "./assets/animals/turtle.svg",
  "./assets/animals/whale.svg",
  "./assets/animals/zebra.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon.svg",
  "./assets/worlds/forest.svg",
  "./assets/worlds/meadow.svg",
  "./assets/worlds/ocean.svg",
  "./assets/worlds/safari.svg",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("little-match-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).catch((error) => {
          if (event.request.mode === "navigate")
            return caches.match("./index.html");
          throw error;
        }),
    ),
  );
});
