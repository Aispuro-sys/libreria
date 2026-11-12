import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Catalog from "./components/Catalog";
import Reader from "./components/Reader";
import Footer from "./components/Footer";
import NotesModal from "./components/NotesModal";
import ExitConfirm from "./components/ExitConfirm";
import ProfileModal from "./components/ProfileModal";
import { AudiobookSection, InstallSection } from "./components/InfoSections";
import { LOCAL_BOOKS, EXTRA_BOOKS, BOOKS } from "./data/books";
import { unlockTTS } from "./lib/tts";
import {
  getUsers, saveUsers, getCurrentUserId, setCurrentUserId,
  loadJSON, saveJSON, uKey, createUser,
} from "./lib/store";

const BOOKS_CACHE = "biblio-books-v1";

export default function App() {
  /* ---------- Catálogo externo (JSON servido desde /data) ---------- */
  const [external, setExternal] = useState([]);
  useEffect(() => {
    fetch("/data/externalBooks.json")
      .then((r) => (r.ok ? r.json() : []))
      .then(setExternal)
      .catch(() => {});
  }, []);
  const catalog = useMemo(() => [...BOOKS, ...external], [external]);

  /* ---------- Perfiles ---------- */
  const [users, setUsers] = useState(getUsers);
  const [uid, setUid] = useState(getCurrentUserId);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const user = users.find((u) => u.id === uid) || null;

  /* ---------- Datos por usuario ---------- */
  const [progressMap, setProgressMap] = useState({});
  const [favArr, setFavArr] = useState([]);
  const [notesMap, setNotesMap] = useState({});
  const favs = useMemo(() => new Set(favArr), [favArr]);

  // Cargar datos del usuario activo
  useEffect(() => {
    if (!uid) { setProgressMap({}); setFavArr([]); setNotesMap({}); return; }
    setProgressMap(loadJSON(uKey(uid, "progress"), {}));
    setFavArr(loadJSON(uKey(uid, "favs"), []));
    setNotesMap(loadJSON(uKey(uid, "notes"), {}));
  }, [uid]);

  const gateNeeded = !user;

  const handleSelectUser = (id) => {
    setUid(id);
    setCurrentUserId(id);
    setProfilesOpen(false);
  };

  const handleCreateUser = (name, color) => {
    const u = createUser(name, color);
    u.acceptedAt = Date.now(); // consentimiento de privacidad/términos
    const next = [...users, u];
    setUsers(next);
    saveUsers(next);
    handleSelectUser(u.id);
  };

  const handleDeleteUser = (id) => {
    const next = users.filter((u) => u.id !== id);
    setUsers(next);
    saveUsers(next);
    // Los datos quedan en localStorage por si se recrea, pero cerramos sesión
    if (id === uid) {
      setUid(null);
      setCurrentUserId(null);
    }
  };

  /* ---------- UI general ---------- */
  const [reader, setReader] = useState(null); // { book, listen, page }
  const [notesItem, setNotesItem] = useState(null);
  const [pendingExternal, setPendingExternal] = useState(null);
  const [offlineMap, setOfflineMap] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* ---------- Progreso ---------- */
  const handleProgress = useCallback(
    (bookId, p) => {
      if (!uid) return;
      setProgressMap((prev) => {
        const next = { ...prev, [bookId]: p };
        saveJSON(uKey(uid, "progress"), next);
        return next;
      });
    },
    [uid]
  );

  /* ---------- Favoritos ---------- */
  const toggleFav = useCallback(
    (itemId) => {
      if (!uid) return;
      setFavArr((prev) => {
        const next = prev.includes(itemId) ? prev.filter((i) => i !== itemId) : [...prev, itemId];
        saveJSON(uKey(uid, "favs"), next);
        return next;
      });
    },
    [uid]
  );

  /* ---------- Notas ---------- */
  const addNote = useCallback(
    (itemId, pageKey, text) => {
      if (!uid) return;
      setNotesMap((prev) => {
        const item = { ...(prev[itemId] || {}) };
        item[pageKey] = [...(item[pageKey] || []), { id: `n${Date.now().toString(36)}`, text, ts: Date.now() }];
        const next = { ...prev, [itemId]: item };
        saveJSON(uKey(uid, "notes"), next);
        return next;
      });
    },
    [uid]
  );

  const deleteNote = useCallback(
    (itemId, pageKey, noteId) => {
      if (!uid) return;
      setNotesMap((prev) => {
        const item = { ...(prev[itemId] || {}) };
        item[pageKey] = (item[pageKey] || []).filter((n) => n.id !== noteId);
        if (!item[pageKey].length) delete item[pageKey];
        const next = { ...prev };
        if (Object.keys(item).length) next[itemId] = item;
        else delete next[itemId];
        saveJSON(uKey(uid, "notes"), next);
        return next;
      });
    },
    [uid]
  );

  /* ---------- Offline ---------- */
  useEffect(() => {
    if (!("caches" in window)) return;
    Promise.all(BOOKS.map(async (b) => [b.id, !!(await caches.match(b.file))])).then((entries) =>
      setOfflineMap(Object.fromEntries(entries))
    );
  }, []);

  const toggleOffline = useCallback(
    async (book) => {
      if (!("caches" in window)) {
        showToast("El caché offline requiere HTTPS o localhost. La lectura sí funciona así.");
        return;
      }
      const cache = await caches.open(BOOKS_CACHE);
      if (offlineMap[book.id]) {
        await cache.delete(book.file);
        setOfflineMap((m) => ({ ...m, [book.id]: false }));
        showToast(`«${book.title}» eliminado del caché offline.`);
      } else {
        try {
          await cache.add(book.file);
          setOfflineMap((m) => ({ ...m, [book.id]: true }));
          showToast(`«${book.title}» disponible sin conexión.`);
        } catch {
          showToast("No se pudo descargar el libro para offline.");
        }
      }
    },
    [offlineMap, showToast]
  );

  /* ---------- Lector ---------- */
  const openReader = (book, listen) => {
    if (listen) unlockTTS();
    setReader({ book, listen, page: progressMap[book.id]?.page || 1 });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Biblioteca", text: "Mi biblioteca de libros en español", url: location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(location.href);
      showToast("Enlace copiado al portapapeles.");
    }
  };

  return (
    <div className="min-h-screen bg-paper text-mist flex flex-col">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] metal text-ink px-4 py-3 shadow-2xl flex items-center gap-3 animate-slideUp border border-steel-400 max-w-[calc(100vw-3rem)]">
          <div className="w-6 h-6 bg-ink text-white flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold">{toast}</span>
          <button onClick={() => setToast(null)} className="text-steel-400 hover:text-ink ml-2 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Navbar onShare={handleShare} user={user} onOpenProfiles={() => setProfilesOpen(true)} />

      <main className="flex-1">
        <Hero catalog={catalog} />
        <Catalog
          catalog={catalog}
          favs={favs}
          progressMap={progressMap}
          offlineMap={offlineMap}
          notesMap={notesMap}
          onRead={(b) => openReader(b, false)}
          onListen={(b) => openReader(b, true)}
          onToggleOffline={toggleOffline}
          onToggleFav={toggleFav}
          onOpenNotes={setNotesItem}
          onOpenExternal={setPendingExternal}
        />
        <AudiobookSection />
        <InstallSection />
      </main>

      <Footer />

      {reader && (
        <Reader
          book={reader.book}
          initialPage={reader.page}
          startListening={reader.listen}
          fav={favs.has(reader.book.id)}
          onToggleFav={toggleFav}
          notes={notesMap[reader.book.id] || {}}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
          onProgress={handleProgress}
          onClose={() => setReader(null)}
        />
      )}

      {pendingExternal && (
        <ExitConfirm
          item={pendingExternal}
          onCancel={() => setPendingExternal(null)}
          onConfirm={() => {
            window.open(pendingExternal.url, "_blank", "noopener");
            setPendingExternal(null);
          }}
        />
      )}

      {notesItem && (
        <NotesModal
          item={notesItem}
          notes={notesMap[notesItem.id]?.general || []}
          onAdd={(text) => addNote(notesItem.id, "general", text)}
          onDelete={(id) => deleteNote(notesItem.id, "general", id)}
          onClose={() => setNotesItem(null)}
        />
      )}

      {(profilesOpen || gateNeeded) && (
        <ProfileModal
          users={users}
          currentId={uid}
          gate={gateNeeded}
          onSelect={handleSelectUser}
          onCreate={handleCreateUser}
          onDelete={handleDeleteUser}
          onClose={() => setProfilesOpen(false)}
        />
      )}
    </div>
  );
}
