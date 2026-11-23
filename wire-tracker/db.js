/* IndexedDB storage. Photos live here as blobs. Text is also mirrored to localStorage by app.js. */
(function (root) {
  const DB_NAME = "wire-tracker";
  const DB_VERSION = 2;
  const STORES = ["boxes", "wires", "groups", "photos", "diagrams", "nodes", "strokes"];
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!root.indexedDB) {
        reject(new Error("IndexedDB is not available"));
        return;
      }
      const request = root.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        const db = request.result;
        STORES.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
        });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () {
        dbPromise = null;
        reject(request.error || new Error("Could not open storage"));
      };
    });
    return dbPromise;
  }

  function getAll(storeName) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = function () { resolve(request.result || []); };
      request.onerror = function () { reject(request.error || new Error("Could not read storage")); };
    }));
  }

  function load() {
    return Promise.all(STORES.map(getAll)).then((rows) => ({
      boxes: rows[0],
      wires: rows[1],
      groups: rows[2],
      photos: rows[3],
      diagrams: rows[4],
      nodes: rows[5],
      strokes: rows[6],
    }));
  }

  function apply(ops) {
    if (!ops.length) return Promise.resolve();
    return open().then((db) => new Promise((resolve, reject) => {
      const names = [];
      ops.forEach((op) => {
        if (names.indexOf(op.store) === -1) names.push(op.store);
      });
      const tx = db.transaction(names, "readwrite");
      ops.forEach((op) => {
        const store = tx.objectStore(op.store);
        if (op.type === "del") store.delete(op.id);
        else store.put(op.value);
      });
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error || new Error("Could not save")); };
      tx.onabort = function () { reject(tx.error || new Error("Save was aborted")); };
    }));
  }

  function replaceAll(data) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORES, "readwrite");
      STORES.forEach((name) => tx.objectStore(name).clear());
      (data.boxes || []).forEach((item) => tx.objectStore("boxes").put(item));
      (data.wires || []).forEach((item) => tx.objectStore("wires").put(item));
      (data.groups || []).forEach((item) => tx.objectStore("groups").put(item));
      (data.photos || []).forEach((item) => tx.objectStore("photos").put(item));
      (data.diagrams || []).forEach((item) => tx.objectStore("diagrams").put(item));
      (data.nodes || []).forEach((item) => tx.objectStore("nodes").put(item));
      (data.strokes || []).forEach((item) => tx.objectStore("strokes").put(item));
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error || new Error("Could not replace storage")); };
      tx.onabort = function () { reject(tx.error || new Error("Replace was aborted")); };
    }));
  }

  root.WireDB = { load: load, apply: apply, replaceAll: replaceAll };
})(typeof globalThis !== "undefined" ? globalThis : this);
