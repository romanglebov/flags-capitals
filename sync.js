// Синхронизация прогресса через Firebase: вход через Google, данные в Firestore (users/{uid}).
(function () {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !window.firebase) return;
  const box = $('#sync'), txt = $('#syncText'), btnIn = $('#syncIn'), btnOut = $('#syncOut');
  box.hidden = false;
  firebase.initializeApp(cfg);
  const auth = firebase.auth(), db = firebase.firestore();
  let user = null, unsub = null, timer = null, ready = false;
  const same = (x, y) => { const a = Object.assign({}, x), b = Object.assign({}, y); delete a.ts; delete b.ts; return JSON.stringify(a) === JSON.stringify(b); };
  const say = t => { txt.textContent = t; };
  const okText = () => say(`${user.email || user.displayName || 'Аккаунт Google'} · прогресс сохранён в облаке`);

  async function push() {
    if (!user) return;
    try {
      await db.collection('users').doc(user.uid).set({
        state: JSON.stringify(S),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      okText();
    } catch (e) {
      say('Не удалось сохранить в облако: нет связи. Попробую снова при следующем ответе.');
    }
  }
  window.syncPush = function () {
    if (!user || !ready) return;
    clearTimeout(timer);
    timer = setTimeout(push, 1200);
  };
  window.addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); push(); } });

  function applyRemote(remote) {
    const merged = mergeStates(S, remote);
    const localChanged = !same(merged, S), remoteChanged = !same(merged, remote);
    S = merged;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    if (localChanged && !L) renderHome();
    return remoteChanged;
  }

  auth.onAuthStateChanged(u => {
    user = u; ready = false;
    if (unsub) { unsub(); unsub = null; }
    btnIn.hidden = !!u; btnOut.hidden = !u;
    if (!u) { say('Войдите через Google, и прогресс будет общим на телефоне и компьютере.'); return; }
    say('Загружаю прогресс из облака…');
    unsub = db.collection('users').doc(u.uid).onSnapshot(snap => {
      if (snap.metadata.hasPendingWrites) return;
      let remote = null;
      try { remote = snap.exists ? JSON.parse(snap.data().state) : null; } catch (e) {}
      const needPush = remote ? applyRemote(remote) : true;
      ready = true;
      if (needPush) push(); else okText();
    }, err => say('Нет доступа к облаку (' + err.code + '). Прогресс пока сохраняется только на этом устройстве.'));
  });

  btnIn.onclick = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try { await auth.signInWithPopup(provider); }
    catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) auth.signInWithRedirect(provider);
      else if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) toast('Не удалось войти: ' + e.code);
    }
  };
  btnOut.onclick = () => modal('<h3>Выйти из аккаунта?</h3><p>Прогресс останется в облаке и на этом устройстве.</p>',
    [['Остаться', '', null], ['Выйти', 'ghost', () => auth.signOut()]]);
})();
