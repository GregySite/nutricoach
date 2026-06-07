import { useState, useRef, useEffect } from "react";

// ─── DATA ─────────────────────────────────────────────────────────────────────

const MEALS = [
  { id: "matin",  emoji: "🌅", label: "Matin",    time: "7h – 10h"  },
  { id: "midi",   emoji: "☀️", label: "Déjeuner", time: "12h – 14h" },
  { id: "snack",  emoji: "🍎", label: "Snack",    time: "15h – 17h" },
  { id: "soir",   emoji: "🌙", label: "Dîner",    time: "19h – 21h" },
];

const PACES = [
  { id: "gentle",    label: "En douceur", sub: "~0.5 kg / semaine", icon: "🐢" },
  { id: "moderate",  label: "Modéré",     sub: "~1 kg / semaine",   icon: "🚶" },
  { id: "intensive", label: "Intensif",   sub: "~1.5 kg / semaine", icon: "🏃" },
];

const ACTIVITY = [
  { id: "sedentary", label: "Sédentaire",   sub: "Peu ou pas de sport"  },
  { id: "light",     label: "Léger",        sub: "1 – 2 fois/semaine"   },
  { id: "moderate",  label: "Actif",        sub: "3 – 4 fois/semaine"   },
  { id: "athletic",  label: "Très sportif", sub: "5 fois+/semaine"      },
];

const RESTRICTIONS = ["Kasher", "Sans gluten", "Végétarien", "Végétalien", "Sans porc", "Sans lactose"];
const WEAKNESSES   = ["Sucré", "Grignotage", "Fromage", "Chocolat", "Chips", "Alcool", "Fast-food", "Soda", "Pain", "Charcuterie"];

const QUICK_ACTIONS = [
  { label: "😋 J'ai faim",        q: "J'ai faim là maintenant, qu'est-ce que je peux manger ?" },
  { label: "⏭ Sauter le dîner ?", q: "Est-ce que je peux sauter le dîner ce soir ?" },
  { label: "💪 Exercice rapide",   q: "Donne-moi un exercice rapide à faire là maintenant, 5 à 10 minutes max." },
  { label: "🥂 Soirée ce soir",    q: "J'ai une soirée ce soir avec repas et boissons. Comment je m'organise ?" },
  { label: "📊 Bilan du jour",     q: "Fais-moi un bilan de ma journée alimentaire." },
];

const OB_STEPS = ["Profil", "Rythme", "Restrictions", "Points faibles", "Activité"];

// ─── THEME ────────────────────────────────────────────────────────────────────

const T = {
  bg:      "#09090F",
  surf:    "#101018",
  surf2:   "#16162A",
  border:  "#1E1E35",
  acc:     "#FF6B35",
  accSoft: "rgba(255,107,53,0.1)",
  gold:    "#FFBA08",
  text:    "#EEEEFF",
  muted:   "#66668A",
  dim:     "#2A2A42",
};
const grad = `linear-gradient(135deg, ${T.acc}, ${T.gold})`;

// ─── SYSTEM PROMPT BUILDER ────────────────────────────────────────────────────

function buildSystemPrompt(profile, log) {
  const now  = new Date();
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const paceLabel = { gentle: "en douceur (~0.5 kg/sem)", moderate: "modéré (~1 kg/sem)", intensive: "intensif (~1.5 kg/sem)" }[profile.pace];
  const actLabel  = { sedentary: "sédentaire", light: "légèrement actif", moderate: "actif", athletic: "très sportif" }[profile.activity];
  const diff = +profile.currentWeight - +profile.targetWeight;
  return `Tu es NutriCoach, le coach nutrition personnel de ${profile.name}.

PROFIL :
• Poids actuel : ${profile.currentWeight} kg → Objectif : ${profile.targetWeight} kg (${diff > 0 ? `perdre ${diff} kg` : "maintenir le poids"})
• Rythme choisi : ${paceLabel}
• Restrictions : ${profile.restrictions.length ? profile.restrictions.join(", ") : "aucune"}
• Points faibles : ${profile.weaknesses.length ? profile.weaknesses.join(", ") : "aucun"}
• Niveau d'activité : ${actLabel}

JOURNAL D'AUJOURD'HUI (${date}, il est ${time}) :
• Matin    : ${log.matin || "(non logué)"}
• Déjeuner : ${log.midi  || "(non logué)"}
• Snack    : ${log.snack || "(rien)"}
• Dîner    : ${log.soir  || "(pas encore mangé)"}

RÈGLES :
- Toujours en français, toujours tutoyer ${profile.name}
- Réponses directes et chaleureuses : 3 à 5 phrases max (sauf programme d'exercice détaillé)
- Tenir compte de TOUT ce qui a été mangé aujourd'hui avant de répondre
- Adapter chaque conseil aux restrictions alimentaires de ${profile.name}
- Jamais de conseils médicaux — orienter vers un médecin si besoin
- Listes à puces uniquement pour les exercices ou les menus détaillés
- Être honnête mais toujours encourageant`;
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────

const S = {
  primBtn: {
    padding: "13px 20px", borderRadius: 12, background: grad,
    border: "none", color: "#fff", fontWeight: 700, fontSize: 15,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  secBtn: {
    padding: "13px 20px", borderRadius: 12, background: "transparent",
    border: `1px solid ${T.border}`, color: T.muted, fontWeight: 500,
    fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  input: {
    display: "block", width: "100%", marginTop: 6,
    padding: "12px 14px", borderRadius: 10,
    border: `1px solid ${T.border}`, background: T.surf2,
    color: T.text, fontFamily: "'DM Sans', sans-serif", fontSize: 15,
    outline: "none",
  },
};

// ─── CHIP COMPONENT ───────────────────────────────────────────────────────────

function Chip({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20,
      border: `1px solid ${selected ? T.acc : T.border}`,
      background: selected ? T.accSoft : "transparent",
      color: selected ? T.acc : T.muted,
      fontSize: 13, cursor: "pointer", transition: "all 0.15s",
      fontFamily: "'DM Sans', sans-serif", fontWeight: selected ? 600 : 400,
    }}>
      {label}
    </button>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function NutriCoach() {
  const [screen,    setScreen]    = useState("onboarding");
  const [step,      setStep]      = useState(0);
  const [profile,   setProfile]   = useState({
    name: "", currentWeight: "", targetWeight: "",
    pace: "moderate", restrictions: [], weaknesses: [], activity: "light",
  });
  const [log,       setLog]       = useState({ matin: "", midi: "", snack: "", soir: "" });
  const [logTarget, setLogTarget] = useState(null);
  const [logText,   setLogText]   = useState("");
  const [messages,  setMessages]  = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [loading,   setLoading]   = useState(false);
  const endRef    = useRef(null);
  const inputRef  = useRef(null);

  // Inject global styles
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: ${T.bg}; color: ${T.text}; font-family: 'DM Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
      ::-webkit-scrollbar { width: 3px; }
      ::-webkit-scrollbar-thumb { background: ${T.dim}; border-radius: 2px; }
      textarea, input { outline: none; }
      @keyframes blink { 0%,100% { opacity:.15 } 50% { opacity:1 } }
      @keyframes fab-glow { 0%,100% { box-shadow: 0 6px 30px rgba(255,107,53,0.4) } 50% { box-shadow: 0 6px 44px rgba(255,107,53,0.65) } }
      @keyframes slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
    `;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const toggleArr = (field, item) => {
    const arr = profile[field];
    setProfile({ ...profile, [field]: arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item] });
  };

  const stepOk = () => {
    if (step === 0) return profile.name.trim() && +profile.currentWeight > 0 && +profile.targetWeight > 0;
    return true;
  };

  const openLog = (id) => { setLogTarget(id); setLogText(log[id] || ""); };
  const saveLog = () => { setLog({ ...log, [logTarget]: logText }); setLogTarget(null); setLogText(""); };

  const startApp = () => {
    setMessages([{ role: "assistant", content: `Salut ${profile.name} ! 🎯 Je suis NutriCoach, ton assistant nutrition perso. Log tes repas au fil de la journée, et n'hésite pas à me poser n'importe quelle question à tout moment — même pour un petit creux à 22h. On y va !` }]);
    setScreen("home");
  };

  const sendMsg = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setChatInput("");
    setLoading(true);
    try {
      const res  = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildSystemPrompt(profile, log),
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data  = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "Désolé, une erreur s'est produite.";
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...history, { role: "assistant", content: "Erreur de connexion. Réessaie dans un instant." }]);
    } finally {
      setLoading(false);
    }
  };

  // ── ONBOARDING ───────────────────────────────────────────────────────────────

  if (screen === "onboarding") {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
        {/* Progress */}
        <div style={{ width: "100%", maxWidth: 430, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
            {OB_STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < step ? T.acc : i === step ? `${T.acc}88` : T.dim, transition: "background 0.3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.muted }}>{OB_STEPS[step].toUpperCase()}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.muted }}>{step + 1} / 5</span>
          </div>
        </div>

        {/* Card */}
        <div style={{ width: "100%", maxWidth: 430, background: T.surf, borderRadius: 20, border: `1px solid ${T.border}`, padding: "30px 24px" }}>

          {step === 0 && <>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Faisons connaissance 👋</h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 24 }}>Quelques infos rapides pour personnaliser ton coaching.</p>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>Prénom</span>
              <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Ton prénom" style={S.input} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>Poids actuel (kg)</span>
                <input type="number" value={profile.currentWeight} onChange={e => setProfile({ ...profile, currentWeight: e.target.value })} placeholder="ex: 82" style={S.input} />
              </label>
              <label>
                <span style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>Objectif (kg)</span>
                <input type="number" value={profile.targetWeight} onChange={e => setProfile({ ...profile, targetWeight: e.target.value })} placeholder="ex: 75" style={S.input} />
              </label>
            </div>
          </>}

          {step === 1 && <>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Ton rythme 🎯</h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 22 }}>À quelle vitesse tu veux progresser ?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PACES.map(p => (
                <button key={p.id} onClick={() => setProfile({ ...profile, pace: p.id })} style={{
                  padding: "15px 18px", borderRadius: 12,
                  border: `1.5px solid ${profile.pace === p.id ? T.acc : T.border}`,
                  background: profile.pace === p.id ? T.accSoft : "transparent",
                  color: T.text, cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 14,
                  transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif",
                }}>
                  <span style={{ fontSize: 22 }}>{p.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{p.label}</div>
                    <div style={{ color: T.muted, fontSize: 13 }}>{p.sub}</div>
                  </div>
                  {profile.pace === p.id && <span style={{ color: T.acc }}>✓</span>}
                </button>
              ))}
            </div>
          </>}

          {step === 2 && <>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Restrictions 🥗</h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 22 }}>Sélectionne ce qui s'applique. C'est optionnel.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {RESTRICTIONS.map(r => <Chip key={r} label={r} selected={profile.restrictions.includes(r)} onClick={() => toggleArr("restrictions", r)} />)}
            </div>
          </>}

          {step === 3 && <>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Tes petits défauts 😅</h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 22 }}>Sois honnête, c'est pour mieux t'aider !</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {WEAKNESSES.map(w => <Chip key={w} label={w} selected={profile.weaknesses.includes(w)} onClick={() => toggleArr("weaknesses", w)} />)}
            </div>
          </>}

          {step === 4 && <>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Ton activité 🏋️</h2>
            <p style={{ color: T.muted, fontSize: 14, marginBottom: 22 }}>En dehors du travail.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ACTIVITY.map(a => (
                <button key={a.id} onClick={() => setProfile({ ...profile, activity: a.id })} style={{
                  padding: "14px 16px", borderRadius: 12,
                  border: `1.5px solid ${profile.activity === a.id ? T.acc : T.border}`,
                  background: profile.activity === a.id ? T.accSoft : "transparent",
                  color: T.text, cursor: "pointer", textAlign: "left",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.label}</div>
                    <div style={{ color: T.muted, fontSize: 12 }}>{a.sub}</div>
                  </div>
                  {profile.activity === a.id && <span style={{ color: T.acc }}>✓</span>}
                </button>
              ))}
            </div>
          </>}

          {/* Nav */}
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            {step > 0 && <button onClick={() => setStep(step - 1)} style={S.secBtn}>← Retour</button>}
            <button onClick={() => step < 4 ? setStep(step + 1) : startApp()} disabled={!stepOk()} style={{ ...S.primBtn, flex: 1, opacity: stepOk() ? 1 : 0.38 }}>
              {step < 4 ? "Continuer →" : "🚀 C'est parti !"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── HOME ─────────────────────────────────────────────────────────────────────

  if (screen === "home") {
    const today   = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const logged  = MEALS.filter(m => log[m.id].trim()).length;
    const diff    = +profile.currentWeight - +profile.targetWeight;

    return (
      <div style={{ minHeight: "100vh", background: T.bg, paddingBottom: 110 }}>
        {/* Header */}
        <div style={{ padding: "40px 20px 20px", maxWidth: 430, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.muted, marginBottom: 5, textTransform: "capitalize" }}>{today}</p>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>Bonjour, {profile.name} 👋</h1>
            </div>
            <button onClick={() => { setStep(0); setScreen("onboarding"); }} title="Modifier le profil" style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18, padding: 6, borderRadius: 8 }}>
              ⚙️
            </button>
          </div>

          {/* Stats bar */}
          <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 14, background: T.surf, border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: T.muted, fontSize: 10, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 }}>Objectif</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{diff > 0 ? `− ${diff} kg` : "Maintenir"}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: T.muted, fontSize: 10, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 }}>Repas loggués</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: logged === 4 ? T.gold : T.acc }}>{logged} / 4</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: T.muted, fontSize: 10, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8 }}>Rythme</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {profile.pace === "gentle" ? "🐢 Doux" : profile.pace === "moderate" ? "🚶 Modéré" : "🏃 Intensif"}
              </div>
            </div>
          </div>
        </div>

        {/* Meals */}
        <div style={{ padding: "0 20px", maxWidth: 430, margin: "0 auto" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            Journal du jour
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {MEALS.map(meal => {
              const has = !!log[meal.id].trim();
              return (
                <button key={meal.id} onClick={() => openLog(meal.id)} style={{
                  padding: "16px 18px", borderRadius: 14,
                  border: `1.5px solid ${has ? T.acc : T.border}`,
                  background: has ? T.accSoft : T.surf,
                  cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 14,
                  transition: "all 0.15s", width: "100%",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{meal.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, color: T.text, fontSize: 15 }}>{meal.label}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.muted }}>{meal.time}</span>
                    </div>
                    <p style={{ fontSize: 13, color: has ? T.muted : T.dim, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {has ? log[meal.id] : "+ Ajouter ce repas"}
                    </p>
                  </div>
                  <span style={{ color: has ? T.acc : T.dim, fontSize: 16, flexShrink: 0 }}>{has ? "✓" : "›"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Floating Coach button */}
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
          <button onClick={() => setScreen("chat")} style={{
            padding: "15px 40px", borderRadius: 50,
            background: grad, border: "none", color: "#fff",
            fontWeight: 700, fontSize: 16, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.5,
            animation: "fab-glow 2.5s ease-in-out infinite",
            display: "flex", alignItems: "center", gap: 9,
          }}>
            🤖 <span>COACH</span>
          </button>
        </div>

        {/* Log modal */}
        {logTarget && (() => {
          const meal = MEALS.find(m => m.id === logTarget);
          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setLogTarget(null)}>
              <div style={{ width: "100%", maxWidth: 430, background: T.surf, borderRadius: "20px 20px 0 0", padding: "24px 20px 48px", border: `1px solid ${T.border}`, animation: "slide-up 0.25s ease-out" }} onClick={e => e.stopPropagation()}>
                <div style={{ textAlign: "center", marginBottom: 18 }}>
                  <div style={{ fontSize: 32 }}>{meal?.emoji}</div>
                  <h3 style={{ fontWeight: 700, fontSize: 18, marginTop: 8 }}>{meal?.label}</h3>
                </div>
                <textarea value={logText} onChange={e => setLogText(e.target.value)} placeholder={`Qu'as-tu mangé ? (ex: salade niçoise, yaourt)`} rows={3} autoFocus style={{ ...S.input, marginTop: 0, resize: "none", background: T.surf2 }} />
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button onClick={() => setLogTarget(null)} style={S.secBtn}>Annuler</button>
                  <button onClick={saveLog} style={{ ...S.primBtn, flex: 1 }}>✓ Enregistrer</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ── CHAT ─────────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: "fixed", inset: 0, background: T.bg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", background: T.surf, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "2px 4px" }}>←</button>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🤖</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>NutriCoach</div>
          <div style={{ color: T.muted, fontSize: 11 }}>
            Contexte du jour actif · {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Quick action chips */}
      <div style={{ padding: "10px 14px", background: T.surf, borderBottom: `1px solid ${T.border}`, display: "flex", gap: 7, overflowX: "auto", flexShrink: 0 }}>
        {QUICK_ACTIONS.map(a => (
          <button key={a.label} onClick={() => sendMsg(a.q)} disabled={loading} style={{
            padding: "7px 13px", borderRadius: 20,
            border: `1px solid ${T.border}`, background: "transparent",
            color: loading ? T.dim : T.muted, fontSize: 12,
            cursor: loading ? "not-allowed" : "pointer",
            whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.15s",
          }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12, alignItems: "flex-end", gap: 8 }}>
            {msg.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🤖</div>
            )}
            <div style={{
              maxWidth: "76%", padding: "12px 16px", fontSize: 14, lineHeight: 1.68,
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "user" ? grad : T.surf2,
              border: msg.role === "assistant" ? `1px solid ${T.border}` : "none",
              color: msg.role === "user" ? "#fff" : T.text,
              whiteSpace: "pre-wrap",
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
            <div style={{ padding: "14px 18px", borderRadius: "18px 18px 18px 4px", background: T.surf2, border: `1px solid ${T.border}`, display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.acc, animation: `blink 1.4s ${i * 0.22}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "12px 14px 28px", background: T.surf, borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(chatInput); } }}
          placeholder="Pose ta question..."
          style={{ ...S.input, marginTop: 0, flex: 1, borderRadius: 24, padding: "12px 18px", background: T.surf2 }}
        />
        <button onClick={() => sendMsg(chatInput)} disabled={loading || !chatInput.trim()} style={{
          width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
          background: loading || !chatInput.trim() ? T.dim : grad,
          border: "none", cursor: loading || !chatInput.trim() ? "not-allowed" : "pointer",
          color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
        }}>↑</button>
      </div>
    </div>
  );
}
