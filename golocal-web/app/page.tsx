"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

type Section = "Home" | "Learn" | "Translate" | "Explore" | "Journal" | "Account";
type Interest = "Food" | "Culture" | "Nightlife" | "Nature" | "Shopping";
type CityStop = { city: string; country: string; language: string; date: string; completion: number; image: string };
type PlaceCard = { id: string; title: string; kind: string; description: string; area: string; image: string; search: string; tags: string[]; destination?: string; link?: string };
type NoteAttachment = { id: string; label: string; url: string; kind: "image" | "link" };
type JournalNote = { id: string; title: string; body: string; updatedAt: string; color: "butter" | "lemon" | "cream"; attachments?: NoteAttachment[] };
type SpeechRecognitionResultLike = ArrayLike<{ transcript: string }> & { isFinal?: boolean };
type SpeechRecognitionEvent = { results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = { lang: string; onresult: ((event: SpeechRecognitionEvent) => void) | null; onerror: ((event?: { error?: string }) => void) | null; onend: (() => void) | null; continuous?: boolean; interimResults?: boolean; start: () => void; stop: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
const formatListeningTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
type ConversationTurn = { id: string; speaker: "you" | "local"; original: string; translated: string };
type ConversationMode = "interpreter" | "roleplay";
type ApiModule = { position: number; situation_key: string; label: string; priority: string; lessons: Array<{ order: number; type: string }> };
type ApiPlan = { curriculum: { modules: ApiModule[] }; ranked_situations: Array<{ situation_key: string; label: string; priority: string; concepts: string[]; rank: number }> };
type ApiLesson = { lesson_id: string; title: string; language: string; level: string; topic: string; introduction: string; vocabulary: Array<{ target: string; translation: string; example: string; example_translation: string }>; exercises: Array<{ exercise_id: string; type: string; prompt: string; options: string[]; correct_answer?: string; explanation?: string }> };
type Gamification = { xp: number; streak: number; dailyGoal: number; dailyXp: number; lastStudyDate: string };

const defaultStops: CityStop[] = [
  { city: "Nice", country: "France", language: "French", date: "20–23 Oct", completion: 70, image: "/abbey-lavender.jpg" },
  { city: "Milan", country: "Italy", language: "Italian", date: "23–25 Oct", completion: 34, image: "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1500&q=85" },
  { city: "Zurich", country: "Switzerland", language: "German", date: "25–27 Oct", completion: 18, image: "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?auto=format&fit=crop&w=1500&q=85" },
];

const places: PlaceCard[] = [
  { id: "port-night", destination: "Nice", title: "A late night by the Port", kind: "Nightlife pick", description: "Cocktails, DJs and a lively crowd around the old harbour.", area: "Port Lympia · 12 min away", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85", search: "nightclubs near Port Lympia Nice France", tags: ["Friends", "Nightlife"] },
  { id: "cours-saleya", destination: "Nice", title: "Cours Saleya after dark", kind: "Local favourite", description: "A long dinner, a little people-watching, then see where the evening goes.", area: "Vieux Nice · 8 min away", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85", search: "restaurants and evening events Cours Saleya Nice", tags: ["Food", "Culture"] },
  { id: "castle-hill", destination: "Nice", title: "Golden hour at Castle Hill", kind: "Worth the detour", description: "Take the steps up for the harbour view just before sunset.", area: "Colline du Château · 15 min away", image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85", search: "Castle Hill Nice France visit", tags: ["Nature", "Views"] },
  { id: "milan-navigli", destination: "Milan", title: "Aperitivo along Navigli", kind: "Evening idea", description: "Follow the canal-side bars into the early evening, then linger for dinner.", area: "Navigli · Milan", image: "https://images.unsplash.com/photo-1514896856000-91cb6f0b0c4b?auto=format&fit=crop&w=1200&q=85", search: "Navigli aperitivo Milan", tags: ["Food", "Nightlife"] },
  { id: "milan-brera", destination: "Milan", title: "A slow afternoon in Brera", kind: "Neighbourhood note", description: "Small galleries, design shops and leafy streets between the big sights.", area: "Brera · Milan", image: "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=85", search: "Brera neighborhood Milan", tags: ["Culture", "Shopping"] },
  { id: "zurich-lake", destination: "Zurich", title: "A swim and a lake-side pause", kind: "Local reset", description: "Save time to slow down by the water after the city streets.", area: "Lake Zürich · Zürich", image: "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?auto=format&fit=crop&w=1200&q=85", search: "Lake Zurich swim public baths", tags: ["Nature", "Culture"] },
  { id: "zurich-night", destination: "Zurich", title: "An evening around Zürich West", kind: "Nightlife pick", description: "Explore the converted industrial quarter for bars, music and late dinner.", area: "Zürich West · Zürich", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85", search: "Zurich West nightlife music", tags: ["Nightlife", "Friends"] },
];

const interests: Interest[] = ["Food", "Culture", "Nightlife", "Nature", "Shopping"];
const tripTypes = ["Friends getaway", "Solo discovery", "Family time", "Food & culture", "Slow escape"];
const supportedLanguages = ["English", "French", "Italian", "German", "Portuguese", "Spanish", "Japanese"];
const backendLanguageCodes: Record<string, string> = { French: "fr", German: "de", Japanese: "ja" };
const travelStories = [
  { city: "Nice", title: "Things to know before visiting Nice", source: "Lonely Planet", text: "Local etiquette, market mornings and planning a Riviera stay.", href: "https://www.lonelyplanet.com/articles/things-to-know-before-traveling-to-nice", image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=900&q=85" },
  { city: "Nice", title: "The best neighborhoods to visit in Nice", source: "Lonely Planet", text: "Find the right corner of the city for food, history and a night out.", href: "https://www.lonelyplanet.com/articles/best-neighborhoods-in-nice", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85" },
  { city: "Nice", title: "An essential guide to Nice", source: "Condé Nast Traveler", text: "A culture and food guide to the original resort town of the Riviera.", href: "https://www.cntraveler.com/story/things-to-do-nice-france", image: "https://images.unsplash.com/photo-1498307833015-e7b400441eb8?auto=format&fit=crop&w=900&q=85" },
  { city: "Nice", title: "Local reels tagged Nice", source: "Instagram Reels", text: "Browse public travel clips and creator tips for the French Riviera.", href: "https://www.instagram.com/explore/tags/nicefrance/", image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=900&q=85" },
  { city: "Milan", title: "17 best things to do in Milan", source: "Lonely Planet", text: "A city mix of art, aperitivo, architecture and neighbourhood finds.", href: "https://www.lonelyplanet.com/articles/top-things-to-do-in-milan", image: "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=900&q=85" },
  { city: "Milan", title: "Milan neighbourhoods to know", source: "Lonely Planet", text: "Explore areas for history, nightlife, fashion and food.", href: "https://www.lonelyplanet.com/articles/best-neighborhoods-in-milan", image: "https://images.unsplash.com/photo-1514896856000-91cb6f0b0c4b?auto=format&fit=crop&w=900&q=85" },
  { city: "Milan", title: "Local reels tagged Milan", source: "Instagram Reels", text: "Browse public clips from Milan and save ideas for later.", href: "https://www.instagram.com/explore/tags/milano/", image: "https://images.unsplash.com/photo-1514896856000-91cb6f0b0c4b?auto=format&fit=crop&w=900&q=85" },
  { city: "Zurich", title: "10 best things to do in Zürich", source: "Lonely Planet", text: "From lakeside pauses to neighbourhood walks and local food.", href: "https://www.lonelyplanet.com/articles/top-things-to-do-in-zurich", image: "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?auto=format&fit=crop&w=900&q=85" },
  { city: "Zurich", title: "What to know before visiting Zürich", source: "Lonely Planet", text: "Plan a city stay with transport, lakeside and old-town context.", href: "https://www.lonelyplanet.com/articles/things-to-know-before-traveling-to-zurich", image: "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?auto=format&fit=crop&w=900&q=85" },
  { city: "Zurich", title: "Local reels tagged Zürich", source: "Instagram Reels", text: "Browse public creator clips and place ideas for your stay.", href: "https://www.instagram.com/explore/tags/zurich/", image: "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?auto=format&fit=crop&w=900&q=85" },
];
const starterNotes: JournalNote[] = [
  { id: "nice-phrase", title: "For the first café stop", body: "Bonjour!\nUn café crème, s’il vous plaît.\n\nRemember to say bonjour before ordering — it’s a lovely little start.", updatedAt: "Today", color: "butter" },
  { id: "nice-evening", title: "A night around the Port", body: "Ask the host: “Vous avez une table pour quatre ?”\n\nCheck what’s on near Port Lympia when we arrive.", updatedAt: "Yesterday", color: "cream" },
  { id: "nice-market", title: "Cours Saleya market", body: "Go early for flowers and fruit. Save room for socca.", updatedAt: "2 days ago", color: "lemon" },
];
const tripPhrases: Record<string, Array<{ context: string; phrase: string; source: string }>> = {
  French: [
    { context: "At a café", phrase: "Un café crème, s’il vous plaît.", source: "A coffee with cream, please." },
    { context: "Meeting someone", phrase: "Enchanté(e) !", source: "Nice to meet you!" },
    { context: "A little thank you", phrase: "Merci beaucoup.", source: "Thank you very much." },
    { context: "Out with friends", phrase: "On y va ?", source: "Shall we go?" },
  ],
  Italian: [
    { context: "At a café", phrase: "Un caffè, per favore.", source: "A coffee, please." },
    { context: "Meeting someone", phrase: "Piacere di conoscerti.", source: "Nice to meet you." },
    { context: "A little thank you", phrase: "Grazie mille.", source: "Thank you very much." },
    { context: "Out with friends", phrase: "Andiamo?", source: "Shall we go?" },
  ],
  German: [
    { context: "At a café", phrase: "Einen Kaffee, bitte.", source: "A coffee, please." },
    { context: "Meeting someone", phrase: "Freut mich, dich kennenzulernen.", source: "Nice to meet you." },
    { context: "A little thank you", phrase: "Vielen Dank.", source: "Thank you very much." },
    { context: "Out with friends", phrase: "Gehen wir?", source: "Shall we go?" },
  ],
  Portuguese: [
    { context: "At a café", phrase: "Um café, por favor.", source: "A coffee, please." },
    { context: "Meeting someone", phrase: "Prazer em conhecer você.", source: "Nice to meet you." },
    { context: "A little thank you", phrase: "Muito obrigado/a.", source: "Thank you very much." },
    { context: "Out with friends", phrase: "Vamos?", source: "Shall we go?" },
  ],
  Spanish: [
    { context: "At a café", phrase: "Un café, por favor.", source: "A coffee, please." },
    { context: "Meeting someone", phrase: "Encantado/a de conocerte.", source: "Nice to meet you." },
    { context: "A little thank you", phrase: "Muchas gracias.", source: "Thank you very much." },
    { context: "Out with friends", phrase: "¿Vamos?", source: "Shall we go?" },
  ],
  Japanese: [
    { context: "At a café", phrase: "コーヒーをお願いします。", source: "A coffee, please." },
    { context: "Meeting someone", phrase: "はじめまして。", source: "Nice to meet you." },
    { context: "A little thank you", phrase: "どうもありがとうございます。", source: "Thank you very much." },
    { context: "Out with friends", phrase: "行きましょうか？", source: "Shall we go?" },
  ],
};
const sectionMeta: { id: Section; label: string; icon: string }[] = [
  { id: "Home", label: "Home", icon: "home" },
  { id: "Learn", label: "Learning", icon: "book" },
  { id: "Translate", label: "Translate", icon: "mic" },
  { id: "Explore", label: "Explore", icon: "compass" },
  { id: "Journal", label: "Journal", icon: "note" },
];

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "home") return <svg {...p}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg>;
  if (name === "book") return <svg {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8" /></svg>;
  if (name === "mic") return <svg {...p}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8" /></svg>;
  if (name === "compass") return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="m15.8 8.2-2.3 5.3-5.3 2.3 2.3-5.3z" /></svg>;
  if (name === "bookmark") return <svg {...p}><path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.6L6 21z" /></svg>;
  if (name === "note") return <svg {...p}><path d="M7 3.5h8l4 4V20a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2z" /><path d="M14 3.5V8h5M8.5 12h7m-7 3.5h7" /></svg>;
  if (name === "pencil") return <svg {...p}><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5z"/><path d="m13.8 6.7 3.5 3.5"/></svg>;
  if (name === "spark") return <svg {...p}><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></svg>;
  if (name === "cup") return <svg {...p}><path d="M5 8h12v7a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10h2a2 2 0 0 1 0 4h-2M8 3v2m4-2v2m4-2v2M4 22h15" /></svg>;
  if (name === "transit") return <svg {...p}><rect x="5" y="3" width="14" height="16" rx="3" /><path d="M8 7h8v5H8zM8 16h.01M16 16h.01M8 22l2-3m6 3-2-3M3 10h2m14 0h2" /></svg>;
  if (name === "people") return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1zM16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.5V20h-3" /></svg>;
  if (name === "music") return <svg {...p}><path d="M10 18V5l11-2v13M10 8l11-2" /><ellipse cx="7" cy="18" rx="3" ry="2" /><ellipse cx="18" cy="16" rx="3" ry="2" /></svg>;
  if (name === "market") return <svg {...p}><path d="M4 10h16l-1 11H5zM3 10l2-7h14l2 7M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 21v-6h6v6" /></svg>;
  if (name === "pin") return <svg {...p}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
  if (name === "search") return <svg {...p}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>;
  if (name === "swap") return <svg {...p}><path d="M4 7h15l-3-3m4 13H5l3 3" /></svg>;
  if (name === "plus") return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
  if (name === "heart") return <svg {...p}><path d="M20.8 8.8c0 5.1-8.8 11.2-8.8 11.2S3.2 13.9 3.2 8.8a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" /></svg>;
  if (name === "x") return <svg {...p}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  if (name === "link") return <svg {...p}><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1L11 5" /><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 1 0 12 20l1-1" /></svg>;
  if (name === "image") return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></svg>;
  if (name === "sound") return <svg {...p}><path d="M4 10v4h4l5 4V6l-5 4z" /><path d="M17 9a5 5 0 0 1 0 6m2.5-8.5a9 9 0 0 1 0 11" /></svg>;
  if (name === "plane") return <svg {...p}><path d="m3 11 18-7-7 18-3-8-8-3Z" /><path d="m11 14 5-5" /></svg>;
  if (name === "arrow") return <svg {...p}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l2.5 2.5" /></svg>;
}

function Logo() {
  return <a className="brand" href="#home" aria-label="GoLocal home"><Image className="brand-symbol" src="/golocal-mark.png" alt="" width={204} height={192} priority /><span className="brand-copy"><strong>GoLocal</strong></span></a>;
}

function ProfGogo() {
  return <svg className="gogo-mascot" role="img" aria-label="Professor GoGo, your language learning guide" viewBox="0 0 120 120" fill="none">
    <path d="M22 50c0-23 17-39 38-39s38 16 38 39v22c0 21-17 36-38 36S22 93 22 72V50Z" fill="#1769E0" />
    <path d="M32 53c0-17 12-29 28-29s28 12 28 29v15c0 17-12 29-28 29S32 85 32 68V53Z" fill="#EAF3FF" />
    <circle cx="49" cy="58" r="9" fill="white" stroke="#0B2A56" strokeWidth="3" /><circle cx="71" cy="58" r="9" fill="white" stroke="#0B2A56" strokeWidth="3" /><path d="M58 58h4M46 57h1m22 0h1" stroke="#0B2A56" strokeWidth="3" strokeLinecap="round" />
    <path d="M54 76c4 4 8 4 12 0" stroke="#0B2A56" strokeWidth="3" strokeLinecap="round" />
    <path d="m43 25 17-14 17 14" stroke="#66D575" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 46h14m56 0h14M35 105l-6 8m56-8 6 8" stroke="#0B2A56" strokeWidth="5" strokeLinecap="round" />
    <path d="M96 82h17v24H96z" fill="#FFF1A9" stroke="#0B2A56" strokeWidth="3" /><path d="M101 89h8m-8 6h8" stroke="#0B2A56" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

export default function Home() {
  const [activeSection, setActiveSection] = useState<Section>("Home");
  const [stops, setStops] = useState(defaultStops);
  const [stopIndex, setStopIndex] = useState(0);
  const [tripOpen, setTripOpen] = useState(false);
  const [tripDestination, setTripDestination] = useState("");
  const [tripLanguage, setTripLanguage] = useState("Portuguese");
  const [editingTrip, setEditingTrip] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [exploreLocationIndex, setExploreLocationIndex] = useState(0);
  const [postOpen, setPostOpen] = useState(false);
  const [postMessage, setPostMessage] = useState("");
  const [journalLink, setJournalLink] = useState("");
  const [journalMessage, setJournalMessage] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [translateLoading, setTranslateLoading] = useState(false);
  const [accountStage, setAccountStage] = useState<"overview" | "questions" | "login" | "signup" | "otp">("overview");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [showSplash, setShowSplash] = useState(true);
  const [personalityAnswers, setPersonalityAnswers] = useState<string[]>(["", "", ""]);
  const [tripPurpose, setTripPurpose] = useState("Friends getaway");
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>(["Food", "Culture", "Nightlife"]);
  const [saved, setSaved] = useState<PlaceCard[]>([]);
  const [communityPlaces, setCommunityPlaces] = useState<PlaceCard[]>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"pass" | "save" | null>(null);
  const swipeTimer = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [translationSourceLanguage, setTranslationSourceLanguage] = useState("English");
  const [translationTargetLanguage, setTranslationTargetLanguage] = useState("French");
  const [translationStatus, setTranslationStatus] = useState("");
  const [conversationContext, setConversationContext] = useState("At a café");
  const [conversationMode, setConversationMode] = useState<ConversationMode>("interpreter");
  const [conversationOpen, setConversationOpen] = useState(false);
  const [youMessage, setYouMessage] = useState("");
  const [localMessage, setLocalMessage] = useState("");
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [conversationNextSpeaker, setConversationNextSpeaker] = useState<"you" | "local">("you");
  const [conversationStatus, setConversationStatus] = useState("");
  const [conversationLoading, setConversationLoading] = useState(false);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [coachPrompt, setCoachPrompt] = useState("");
  const [coachMessages, setCoachMessages] = useState<Array<{ role: "user" | "assistant"; content: string; moduleTitle?: string }>>([]);
  const [coachError, setCoachError] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [notes, setNotes] = useState<JournalNote[]>(starterNotes);
  const [journalSearch, setJournalSearch] = useState("");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(starterNotes[0].id);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const swipeStart = useRef<number | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const conversationRecognition = useRef<SpeechRecognitionLike | null>(null);
  const conversationTranscript = useRef("");
  const finalizedSpeechResults = useRef<Set<number>>(new Set());
  const liveTranslationQueue = useRef<Promise<void>>(Promise.resolve());
  const liveTranslationLines = useRef<string[]>([]);
  const firstLiveSegmentHandled = useRef(false);
  const audioRecorder = useRef<MediaRecorder | null>(null);
  const audioStream = useRef<MediaStream | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [conversationListeningFor, setConversationListeningFor] = useState<"you" | "local" | null>(null);
  const [listeningSeconds, setListeningSeconds] = useState(0);
  const [apiPlan, setApiPlan] = useState<ApiPlan | null>(null);
  const [apiStatus, setApiStatus] = useState("");
  const [activeLesson, setActiveLesson] = useState<ApiLesson | null>(null);
  const [activeLessonSituation, setActiveLessonSituation] = useState("");
  const [lessonQuestionIndex, setLessonQuestionIndex] = useState(0);
  const [lessonAnswer, setLessonAnswer] = useState("");
  const [lessonFeedback, setLessonFeedback] = useState("");
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonCorrectCount, setLessonCorrectCount] = useState(0);
  const [lessonProgress, setLessonProgress] = useState<Record<string, number>>({});
  const [gamification, setGamification] = useState<Gamification>({ xp: 0, streak: 0, dailyGoal: 50, dailyXp: 0, lastStudyDate: "" });
  const [gamificationLoaded, setGamificationLoaded] = useState(false);
  const [offlinePhraseCount, setOfflinePhraseCount] = useState(0);

  const currentStop = stops[Math.min(stopIndex, stops.length - 1)];
  const exploreStop = stops[Math.min(exploreLocationIndex, stops.length - 1)] || currentStop;
  const translationTarget = translationTargetLanguage;
  const destinationPhrases = tripPhrases[currentStop.language] || tripPhrases.French;
  const matchedPlaces = useMemo(() => {
    const allPlaces = [...communityPlaces, ...places];
    const locationPlaces = allPlaces.filter((place) => !place.destination || place.destination.toLowerCase() === exploreStop.city.toLowerCase());
    const moodTags = tripPurpose === "Friends getaway" ? ["Nightlife", "Food"] : tripPurpose === "Solo discovery" ? ["Culture", "Nature"] : tripPurpose === "Family time" ? ["Nature", "Food"] : tripPurpose === "Food & culture" ? ["Food", "Culture"] : ["Nature", "Culture"];
    const matches = locationPlaces.filter((place) => place.tags.some((tag) => selectedInterests.includes(tag as Interest) && moodTags.includes(tag)));
    if (matches.length) return matches;
    const interestMatches = locationPlaces.filter((place) => place.tags.some((tag) => selectedInterests.includes(tag as Interest)));
    if (interestMatches.length) return interestMatches;
    if (locationPlaces.length) return locationPlaces;
    return [{ id: `starter-${exploreStop.city}`, destination: exploreStop.city, title: `Start your ${exploreStop.city} shortlist`, kind: "Trip starter", description: "Share a local find or adjust your trip mood to build a shortlist for this stop.", area: exploreStop.city, image: exploreStop.image, search: exploreStop.city, tags: ["Culture"] }];
  }, [selectedInterests, communityPlaces, exploreStop.city, exploreStop.image, tripPurpose]);
  const currentPlace = matchedPlaces[placeIndex % matchedPlaces.length];
  const activeNote = notes.find((note) => note.id === activeNoteId) || null;
  const visibleNotes = notes.filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(journalSearch.toLowerCase()));
  const nextLesson = useMemo(() => selectedInterests.includes("Nightlife") ? "A night out with friends" : selectedInterests.includes("Food") ? "Order like a local" : "Meet the locals", [selectedInterests]);
  const builtInModules = useMemo(() => [
    { situation_key: "Greetings", label: "First words & greetings", priority: "Start here", concepts: ["hello", "please", "thank you"], rank: 1 },
    { situation_key: "Restaurant", label: "Order at a café", priority: "For your trip", concepts: ["order a drink", "ask for the bill"], rank: 2 },
    { situation_key: "Transport", label: "Get around town", priority: "For your trip", concepts: ["find a stop", "buy a ticket"], rank: 3 },
    { situation_key: "Shopping", label: "Browse local shops", priority: "Useful nearby", concepts: ["ask the price", "pay politely"], rank: 4 },
    { situation_key: "Social", label: "Meet someone new", priority: "Make a connection", concepts: ["introduce yourself", "keep a chat going"], rank: 5 },
  ], []);
  const learningModules = apiPlan?.ranked_situations?.length ? apiPlan.ranked_situations : builtInModules;
  const minutesRemaining = Math.max(5, Math.ceil((100 - currentStop.completion) / 3));

  useEffect(() => {
    try {
      const storedNotes = window.localStorage.getItem("golocal-journal-v1");
      if (storedNotes) {
        const parsed = JSON.parse(storedNotes) as JournalNote[];
        if (Array.isArray(parsed)) {
          // Hydrate client-only notes after mount; initial render stays deterministic for SSR.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setNotes(parsed);
          setActiveNoteId(parsed[0]?.id || null);
        }
      }
    } catch {
      // If local storage is unavailable, keep the starter notes for this visit.
    } finally {
      setNotesLoaded(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!recognitionActive && !conversationListeningFor) return;
    const timer = window.setInterval(() => setListeningSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recognitionActive, conversationListeningFor]);

  useEffect(() => {
    let cancelled = false;
    const hydrateProfile = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const savedProfile = window.localStorage.getItem("golocal-learning-profile-v1");
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile) as Partial<Gamification> & { lessonProgress?: Record<string, number> };
          const yesterdayDate = new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const today = new Date().toLocaleDateString("en-CA");
          const yesterday = yesterdayDate.toLocaleDateString("en-CA");
          if (typeof parsed.xp === "number") setGamification({ xp: parsed.xp, streak: parsed.lastStudyDate === today || parsed.lastStudyDate === yesterday ? parsed.streak || 0 : 0, dailyGoal: parsed.dailyGoal || 50, dailyXp: parsed.lastStudyDate === today ? parsed.dailyXp || 0 : 0, lastStudyDate: parsed.lastStudyDate || "" });
          if (parsed.lessonProgress && typeof parsed.lessonProgress === "object") setLessonProgress(parsed.lessonProgress);
        }
      } catch {
        // Keep the local learning profile usable for this visit if storage is unavailable.
      } finally {
        setGamificationLoaded(true);
      }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(hydrateProfile); };
  }, []);

  useEffect(() => {
    if (!gamificationLoaded) return;
    try {
      window.localStorage.setItem("golocal-learning-profile-v1", JSON.stringify({ ...gamification, lessonProgress }));
    } catch {
      // XP and lesson completion stay in memory if local storage is unavailable.
    }
  }, [gamification, gamificationLoaded, lessonProgress]);

  useEffect(() => {
    const language = backendLanguageCodes[currentStop.language];
    if (!language) {
      let cancelled = false;
      Promise.resolve().then(() => {
        if (cancelled) return;
        setApiPlan(null);
        setApiStatus(`${currentStop.language} lessons are using GoLocal’s built-in phrase practice for now.`);
      });
      return () => { cancelled = true; };
    }
    const interestMap: Record<Interest, string | null> = { Food: "food", Culture: "culture", Nightlife: "social", Nature: null, Shopping: "shopping" };
    const interestsForApi = selectedInterests.map((interest) => interestMap[interest]).filter((interest): interest is string => Boolean(interest));
    let cancelled = false;
    const statusTimer = window.setTimeout(() => {
      if (!cancelled) setApiStatus("Loading your trip learning plan…");
    }, 0);
    fetch("/api/parvoy/travel/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination: currentStop.city, language, level: "A2", purpose: "tourism", interests: interestsForApi }),
    }).then(async (response) => {
      const result = await response.json() as ApiPlan & { detail?: string };
      if (!response.ok) throw new Error(result.detail || "The learning plan could not be loaded.");
      if (!cancelled) {
        setApiPlan(result);
        setApiStatus("Your trip plan is personalized with GoLocal’s learning engine.");
      }
    }).catch((error: unknown) => {
      if (!cancelled) {
        setApiPlan(null);
        setApiStatus(error instanceof Error ? error.message : "The learning service is unavailable. Built-in practice is ready.");
      }
    });
    return () => { cancelled = true; window.clearTimeout(statusTimer); };
  }, [currentStop.city, currentStop.language, selectedInterests]);

  useEffect(() => {
    const cachedPhrases = tripPhrases[currentStop.language] || tripPhrases.French;
    const key = `golocal-offline-phrases-v1:${currentStop.city.toLowerCase()}:${currentStop.language.toLowerCase()}`;
    try {
      window.localStorage.setItem(key, JSON.stringify(cachedPhrases));
      window.setTimeout(() => setOfflinePhraseCount(cachedPhrases.length), 0);
    } catch {
      window.setTimeout(() => setOfflinePhraseCount(0), 0);
    }
  }, [currentStop.city, currentStop.language]);

  useEffect(() => {
    try {
      const storedSaves = window.localStorage.getItem("golocal-explore-saves-v1");
      if (storedSaves) {
        const parsed = JSON.parse(storedSaves) as PlaceCard[];
        if (Array.isArray(parsed)) {
          // Keep saved discoveries on this device while keeping the first server render deterministic.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSaved(parsed);
        }
      }
    } catch {
      // Saved places remain usable for this visit if storage is unavailable.
    } finally {
      setSavedLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!savedLoaded) return;
    try {
      window.localStorage.setItem("golocal-explore-saves-v1", JSON.stringify(saved));
    } catch {
      // Saves remain available in memory for this visit if storage is unavailable.
    }
  }, [saved, savedLoaded]);

  useEffect(() => {
    if (!notesLoaded) return;
    try {
      window.localStorage.setItem("golocal-journal-v1", JSON.stringify(notes));
    } catch {
      // Notes remain editable for the current visit if storage is unavailable.
    }
  }, [notes, notesLoaded]);

  function addJournalNote() {
    const note: JournalNote = { id: crypto.randomUUID(), title: "Untitled note", body: "", updatedAt: "Just now", color: "butter", attachments: [] };
    setNotes((items) => [note, ...items]);
    setActiveNoteId(note.id);
    setJournalSearch("");
  }

  function addJournalEntry(title: string, body: string) {
    const note: JournalNote = { id: crypto.randomUUID(), title, body, updatedAt: "Just now", color: "butter", attachments: [] };
    setNotes((items) => [note, ...items]);
    setActiveNoteId(note.id);
    setActiveSection("Journal");
    setJournalSearch("");
  }

  function attachLinkToNote() {
    if (!activeNoteId || !journalLink.trim()) return;
    let url: URL;
    try { url = new URL(journalLink.trim().startsWith("http") ? journalLink.trim() : `https://${journalLink.trim()}`); }
    catch { setJournalMessage("Enter a valid web address."); return; }
    if (!["http:", "https:"].includes(url.protocol)) { setJournalMessage("Only web links can be added."); return; }
    const attachment: NoteAttachment = { id: crypto.randomUUID(), label: url.hostname.replace(/^www\./, ""), url: url.toString(), kind: "link" };
    setNotes((items) => items.map((note) => note.id === activeNoteId ? { ...note, attachments: [...(note.attachments || []), attachment], updatedAt: "Just now" } : note));
    setJournalLink("");
    setJournalMessage("Link added to this note.");
  }

  async function importJournalImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    if (!activeNoteId || !files.length) return;
    const allowed = files.filter((file) => file.type.startsWith("image/") && file.size <= 2_000_000);
    if (allowed.length !== files.length) setJournalMessage("Images need to be under 2 MB each.");
    const attachments = await Promise.all(allowed.map((file) => new Promise<NoteAttachment | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? { id: crypto.randomUUID(), label: file.name, url: reader.result, kind: "image" } : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    })));
    const ready = attachments.filter((item): item is NoteAttachment => Boolean(item));
    if (ready.length) {
      setNotes((items) => items.map((note) => note.id === activeNoteId ? { ...note, attachments: [...(note.attachments || []), ...ready], updatedAt: "Just now" } : note));
      setJournalMessage(`${ready.length} image${ready.length === 1 ? "" : "s"} added to this note.`);
    }
  }

  function updateJournalNote(field: "title" | "body", value: string) {
    if (!activeNoteId) return;
    setNotes((items) => items.map((note) => note.id === activeNoteId ? { ...note, [field]: value, updatedAt: "Just now" } : note));
  }

  function deleteJournalNote() {
    if (!activeNote || !window.confirm(`Delete “${activeNote.title || "Untitled note"}”?`)) return;
    const remaining = notes.filter((note) => note.id !== activeNote.id);
    setNotes(remaining);
    setActiveNoteId(remaining[0]?.id || null);
  }

  function toggleInterest(interest: Interest) {
    setSelectedInterests((items) => items.includes(interest) ? items.filter((item) => item !== interest) : [...items, interest]);
  }

  function createTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const destination = String(form.get("destination") || tripDestination || "Lisbon").trim();
    const language = String(form.get("language") || "Portuguese");
    const start = String(form.get("startDate") || "");
    const end = String(form.get("endDate") || "");
    const formattedDate = start && end ? `${new Date(`${start}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}–${new Date(`${end}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : editingTrip ? currentStop.date : "Dates to come";
    const date = formattedDate;
    const lowerDestination = destination.toLowerCase();
    const country = lowerDestination.includes("milan") ? "Italy" : lowerDestination.includes("zurich") || lowerDestination.includes("zürich") ? "Switzerland" : lowerDestination.includes("nice") ? "France" : "";
    const knownStop = stops.find((stop) => stop.city.toLowerCase() === lowerDestination);
    const image = knownStop?.image || (lowerDestination.includes("nice") ? defaultStops[0].image : lowerDestination.includes("milan") ? defaultStops[1].image : lowerDestination.includes("zurich") || lowerDestination.includes("zürich") ? defaultStops[2].image : "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1500&q=85");
    if (editingTrip) {
      setStops((previous) => previous.map((stop, index) => index === stopIndex ? { ...stop, city: destination || "Lisbon", country, language, date, image } : stop));
    } else {
      const newStop: CityStop = { city: destination || "Lisbon", country, language, date, completion: 8, image };
      setStops((previous) => [...previous, newStop]);
      setStopIndex(stops.length);
      setExploreLocationIndex(stops.length);
    }
    setTripOpen(false);
    setTripDestination("");
    setEditingTrip(false);
  }

  function openTripEditor(editing = false) {
    setEditingTrip(editing);
    setTripDestination(editing ? currentStop.city : "");
    setTripLanguage(editing ? currentStop.language : "Portuguese");
    setTripOpen(true);
  }

  function searchTripDestination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const destination = headerSearch.trim();
    if (!destination) return;
    setTripDestination(destination);
    setTripLanguage("Portuguese");
    setEditingTrip(false);
    setHeaderSearch("");
    setTripOpen(true);
  }

  function openBuiltInLesson(situation: string) {
    const wordsByLanguage: Record<string, Array<{ target: string; translation: string }>> = {
      French: [{ target: "Bonjour", translation: "Hello" }, { target: "S’il vous plaît", translation: "Please" }, { target: "Merci", translation: "Thank you" }],
      Italian: [{ target: "Buongiorno", translation: "Hello" }, { target: "Per favore", translation: "Please" }, { target: "Grazie", translation: "Thank you" }],
      German: [{ target: "Guten Tag", translation: "Hello" }, { target: "Bitte", translation: "Please" }, { target: "Danke", translation: "Thank you" }],
      Spanish: [{ target: "Hola", translation: "Hello" }, { target: "Por favor", translation: "Please" }, { target: "Gracias", translation: "Thank you" }],
      Portuguese: [{ target: "Olá", translation: "Hello" }, { target: "Por favor", translation: "Please" }, { target: "Obrigado/a", translation: "Thank you" }],
      Japanese: [{ target: "こんにちは", translation: "Hello" }, { target: "お願いします", translation: "Please" }, { target: "ありがとう", translation: "Thank you" }],
    };
    const words = wordsByLanguage[currentStop.language] || wordsByLanguage.French;
    const selectedModule = learningModules.find((item) => item.situation_key === situation);
    setActiveLesson({
      lesson_id: `built-in-${currentStop.city}-${situation}`,
      title: selectedModule?.label || situation,
      language: currentStop.language,
      level: `0${selectedModule?.rank || 1}`,
      topic: situation,
      introduction: `Build confidence for ${situation.toLowerCase()} in ${currentStop.city}. Learn these useful words, then check what you remember.`,
      vocabulary: words.map((word) => ({ ...word, example: word.target, example_translation: word.translation })),
      exercises: [
        { exercise_id: "hello", type: "multiple_choice", prompt: `Which phrase means “${words[0].translation}”?`, options: [words[0].target, words[2].target, words[1].target], correct_answer: words[0].target, explanation: words[0].target },
        { exercise_id: "thanks", type: "multiple_choice", prompt: `How do you say “${words[2].translation}”?`, options: [words[1].target, words[2].target, words[0].target], correct_answer: words[2].target, explanation: words[2].target },
      ],
    });
    setActiveLessonSituation(situation);
    setLessonQuestionIndex(0);
    setLessonCorrectCount(0);
    setLessonFeedback("");
    setLessonAnswer("");
  }

  async function startBackendLesson(situation: string) {
    const language = backendLanguageCodes[currentStop.language];
    if (!language) {
      openBuiltInLesson(situation);
      return;
    }
    setLessonLoading(true);
    setLessonFeedback("");
    setLessonAnswer("");
    try {
      const listResponse = await fetch(`/api/parvoy/lessons?language=${language}&level=A1`);
      const list = await listResponse.json() as { lessons?: Array<{ lesson_id: string; title: string; topic: string }>; detail?: string };
      if (!listResponse.ok || !list.lessons?.length) throw new Error(list.detail || "No lessons are available for this language yet.");
      const wantedTopic = situation.toLowerCase().includes("restaurant") ? "restaurant" : situation.toLowerCase().includes("greeting") ? "greetings" : situation.toLowerCase().includes("transport") ? "transport" : "";
      const summary = wantedTopic ? list.lessons.find((lesson) => lesson.topic === wantedTopic) : list.lessons[0];
      if (!summary) {
        openBuiltInLesson(situation);
        return;
      }
      const detailResponse = await fetch(`/api/parvoy/lessons/${summary.lesson_id}?language=${language}`);
      const detail = await detailResponse.json() as ApiLesson & { detail?: string };
      if (!detailResponse.ok) throw new Error(detail.detail || "The lesson could not be opened.");
      setActiveLesson(detail);
      setActiveLessonSituation(situation);
      setLessonQuestionIndex(0);
      setLessonCorrectCount(0);
    } catch (error) {
      setApiStatus(error instanceof Error ? error.message : "The lesson service is unavailable.");
      openBuiltInLesson(situation);
    } finally {
      setLessonLoading(false);
    }
  }

  async function checkBackendAnswer() {
    if (!activeLesson || !lessonAnswer.trim() || lessonLoading) return;
    const exercise = activeLesson.exercises[lessonQuestionIndex];
    if (exercise.correct_answer) {
      const correct = lessonAnswer.trim().toLocaleLowerCase() === exercise.correct_answer.toLocaleLowerCase();
      setLessonFeedback(`${correct ? "Correct!" : `Not quite — the answer is ${exercise.correct_answer}.`} ${exercise.explanation || "Keep practising this phrase."}`);
      if (correct) setLessonCorrectCount((count) => count + 1);
      return;
    }
    setLessonLoading(true);
    try {
      const response = await fetch("/api/parvoy/lessons/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: activeLesson.lesson_id, exercise_id: exercise.exercise_id, answer: lessonAnswer }),
      });
      const result = await response.json() as { correct: boolean; correct_answer: string; explanation: string; detail?: string };
      if (!response.ok) throw new Error(result.detail || "The answer could not be checked.");
      setLessonFeedback(`${result.correct ? "Correct!" : `Not quite — ${result.correct_answer}.`} ${result.explanation}`);
      if (result.correct) setLessonCorrectCount((count) => count + 1);
    } catch (error) {
      setLessonFeedback(error instanceof Error ? error.message : "The answer could not be checked.");
    } finally {
      setLessonLoading(false);
    }
  }

  function advanceBackendLesson() {
    if (!activeLesson) return;
    if (lessonQuestionIndex + 1 < activeLesson.exercises.length) {
      setLessonQuestionIndex((index) => index + 1);
      setLessonAnswer("");
      setLessonFeedback("");
      return;
    }
    const moduleKey = `module:${currentStop.city}:${currentStop.language}:${activeLessonSituation}`;
    const alreadyCompleted = Boolean(lessonProgress[activeLesson.lesson_id]);
    const earned = alreadyCompleted ? 0 : 20;
    const today = new Date().toLocaleDateString("en-CA");
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toLocaleDateString("en-CA");
    setGamification((profile) => {
      const sameDay = profile.lastStudyDate === today;
      const newStreak = sameDay ? profile.streak : profile.lastStudyDate === yesterday ? profile.streak + 1 : 1;
      return { ...profile, xp: profile.xp + earned, streak: newStreak, dailyXp: (sameDay ? profile.dailyXp : 0) + earned, lastStudyDate: today };
    });
    setLessonProgress((previous) => ({ ...previous, [activeLesson.lesson_id]: 100, [moduleKey]: 100 }));
    setStops((previous) => previous.map((stop, index) => index === stopIndex ? { ...stop, completion: Math.min(100, stop.completion + 8) } : stop));
    setActiveLesson(null);
  }

  function speakPhrase(text: string, language = currentStop.language) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(text);
    voice.lang = ({ French: "fr-FR", Italian: "it-IT", German: "de-DE", Portuguese: "pt-PT", Spanish: "es-ES", Japanese: "ja-JP" } as Record<string, string>)[language] || "en-US";
    window.speechSynthesis.speak(voice);
  }

  function answerTripQuestion(index: number, answer: string) {
    const next = personalityAnswers.map((current, currentIndex) => currentIndex === index ? answer : current);
    setPersonalityAnswers(next);
    if (next.every(Boolean)) {
      const mapped = next[0] === "Food" ? "Food & culture" : next[0] === "Nightlife" ? "Friends getaway" : next[0] === "Nature" ? "Slow escape" : next[0] === "Museums" ? "Solo discovery" : "Friends getaway";
      setTripPurpose(mapped);
      setAccountStage("signup");
    }
  }

  function continueAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    if (!email) return;
    setAccountEmail(email);
    setAccountStage("otp");
    setAccountMessage("Preview only: this screen does not send an email or verify an OTP. Connect an auth provider to enable secure sign-in and two-step verification.");
  }

  function submitCommunityCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("cardTitle") || "").trim();
    const details = String(form.get("cardDetails") || "").trim();
    const link = String(form.get("cardLink") || "").trim();
    if (!title || !details) return;
    const submitted: PlaceCard = { id: `community-${crypto.randomUUID()}`, destination: exploreStop.city, title, kind: "Community pick", description: details, area: `Shared by Sam · ${exploreStop.city}`, image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=85", search: title, tags: selectedInterests.length ? selectedInterests.slice(0, 2) : ["Culture"], link: link || undefined };
    setCommunityPlaces((items) => [submitted, ...items]);
    setPostOpen(false);
    setPostMessage("Post draft saved on this device. It has not been sent for team review or voucher qualification in this prototype.");
    setPlaceIndex(0);
  }


  function actOnCurrentPlace(action: "pass" | "save") {
    if (swipeTimer.current !== null) return;
    setSwipeDirection(action);
    if (action === "save") setSaved((items) => items.some((item) => item.id === currentPlace.id) ? items : [...items, currentPlace]);
    swipeTimer.current = window.setTimeout(() => {
      setPlaceIndex((index) => index + 1);
      setSwipeDirection(null);
      swipeTimer.current = null;
    }, 230);
  }

  function saveCurrentPlace() { actOnCurrentPlace("save"); }

  function savePhraseToJournal(item: { context: string; phrase: string; source: string }) {
    addJournalEntry(`${item.context} · ${exploreStop.city}`, `${item.phrase}\n${item.source}\n\n${exploreStop.language} · ${exploreStop.city}`);
  }

  function saveLessonToJournal(lesson: string, detail: string) {
    addJournalEntry(`Learning · ${lesson}`, `${detail}\n\n${currentStop.language} · ${currentStop.city}\nAdd your own practice notes here.`);
  }

  function updateLearningLanguage(language: string) {
    setStops((previous) => previous.map((stop, index) => index === stopIndex ? { ...stop, language } : stop));
    setTranslationTargetLanguage(language);
  }

  function savePlaceToJournal(place: PlaceCard) {
    const attachments: NoteAttachment[] = [{ id: crypto.randomUUID(), label: place.title, url: place.image, kind: "image" }, ...(place.link ? [{ id: crypto.randomUUID(), label: "Community link", url: place.link, kind: "link" as const }] : [])];
    const note: JournalNote = { id: crypto.randomUUID(), title: place.title, body: `${place.description}\n\n${place.area}\n${exploreStop.city}`, updatedAt: "Just now", color: "butter", attachments };
    setNotes((items) => [note, ...items]);
    setActiveNoteId(note.id);
    setActiveSection("Journal");
  }

  function skipCurrentPlace() { actOnCurrentPlace("pass"); }

  function handleCardSwipe(endX: number) {
    if (swipeStart.current === null) return;
    const distance = endX - swipeStart.current;
    swipeStart.current = null;
    if (distance > 75) saveCurrentPlace();
    if (distance < -75) skipCurrentPlace();
  }

  async function sendCoach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!coachPrompt.trim() || coachLoading) return;
    const prompt = coachPrompt.trim();
    const conversation = [...coachMessages, { role: "user" as const, content: prompt }];
    setCoachMessages(conversation);
    setCoachPrompt("");
    setCoachError("");
    setCoachLoading(true);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, messages: conversation, city: currentStop.city, language: currentStop.language, purpose: tripPurpose }),
      });
      const result = await response.json() as { reply?: string; moduleTitle?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "The coach couldn’t answer just now.");
      const reply = result.reply || "Prof GoGo couldn’t build that lesson. Please try again.";
      setCoachMessages((previous) => [...previous, { role: "assistant", moduleTitle: result.moduleTitle || "Your custom lesson", content: reply.replace(/^MODULE:\s*.+\n?/m, "") }]);
    } catch (error) {
      setCoachError(error instanceof Error ? error.message : "Could not reach the coach. Please try again.");
    } finally {
      setCoachLoading(false);
    }
  }

  function startSpeechInput() {
    if (recognitionActive) {
      stopSpeechInput();
      return;
    }
    startSpeechCapture("you", true);
  }

  function closeConversation() {
    conversationTranscript.current = "";
    if (audioRecorder.current) {
      audioRecorder.current.onstop = null;
      if (audioRecorder.current.state === "recording") audioRecorder.current.stop();
      audioStream.current?.getTracks().forEach((track) => track.stop());
      audioStream.current = null;
      audioRecorder.current = null;
    } else conversationRecognition.current?.stop();
    setRecognitionActive(false);
    setConversationListeningFor(null);
    setConversationOpen(false);
  }

  function stopSpeechInput() {
    if (audioRecorder.current?.state === "recording") {
      audioRecorder.current.stop();
      return;
    }
    conversationRecognition.current?.stop();
  }

  function startConversationSpeech(speaker: "you" | "local") {
    if (conversationListeningFor === speaker) {
      conversationRecognition.current?.stop();
      return;
    }
    if (conversationListeningFor || recognitionActive) return;
    startSpeechCapture(speaker, false);
  }

  function startSpeechCapture(speaker: "you" | "local", firstTurn: boolean) {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      void startAudioCapture(speaker, firstTurn);
      return;
    }

    const recognition = new Recognition();
    conversationRecognition.current = recognition;
    conversationTranscript.current = "";
    finalizedSpeechResults.current = new Set();
    liveTranslationQueue.current = Promise.resolve();
    liveTranslationLines.current = [];
    firstLiveSegmentHandled.current = false;
    let recognitionError: string | null = null;
    let useRecorderFallback = false;
    recognition.lang = ({ English: "en-US", French: "fr-FR", Italian: "it-IT", German: "de-DE", Portuguese: "pt-PT", Spanish: "es-ES", Japanese: "ja-JP" } as Record<string, string>)[speaker === "you" ? translationSourceLanguage : translationTargetLanguage] || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const phrases: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        const text = event.results[index]?.[0]?.transcript?.trim();
        if (text) phrases.push(text);
      }
      const transcript = phrases.join(" ").trim();
      conversationTranscript.current = transcript;
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const segment = result?.[0]?.transcript?.trim();
        if (!segment || !result.isFinal || finalizedSpeechResults.current.has(index)) continue;
        finalizedSpeechResults.current.add(index);
        queueLiveSpeechSegment(speaker, firstTurn, segment);
      }
      if (firstTurn) {
        setQuery(transcript);
        setTranslationStatus(transcript ? "Translating as you speak… tap to finish your turn." : `Listening in ${translationSourceLanguage}…`);
      } else {
        if (speaker === "you") setYouMessage(transcript); else setLocalMessage(transcript);
        setConversationStatus(transcript ? "Translating as you speak… tap to finish your turn." : `Listening in ${speaker === "you" ? translationSourceLanguage : translationTargetLanguage}…`);
      }
    };
    recognition.onerror = (event) => {
      setRecognitionActive(false);
      setConversationListeningFor(null);
      const issue = event?.error;
      if (issue === "network" || issue === "service-not-allowed") {
        useRecorderFallback = true;
        recognitionError = "Switching to secure audio transcription…";
        if (firstTurn) setTranslationStatus(recognitionError); else setConversationStatus(recognitionError);
        return;
      }
      const message = issue === "not-allowed" || issue === "service-not-allowed"
        ? "Microphone access was blocked. Allow microphone access for this site in your browser settings, then try again."
        : issue === "no-speech"
          ? "No speech was heard. Tap the microphone and speak when the timer starts."
          : `Speech recognition stopped${issue ? ` (${issue})` : ""}. You can type the phrase instead.`;
      recognitionError = message;
      if (firstTurn) setTranslationStatus(message); else setConversationStatus(message);
    };
    recognition.onend = () => {
      setRecognitionActive(false);
      setConversationListeningFor(null);
      if (useRecorderFallback) {
        void startAudioCapture(speaker, firstTurn);
        return;
      }
      if (recognitionError) return;
      const transcript = conversationTranscript.current.trim();
      if (!transcript) {
        if (firstTurn) void startAudioCapture(speaker, firstTurn);
        else setConversationStatus("No speech was captured. Trying microphone transcription…");
        return;
      }
      if (finalizedSpeechResults.current.size > 0) {
        void liveTranslationQueue.current.then(() => {
          setConversationNextSpeaker(speaker === "you" ? "local" : "you");
          const combined = liveTranslationLines.current.join(" ").trim();
          if (combined) speakPhrase(combined, speaker === "you" ? translationTargetLanguage : translationSourceLanguage);
          if (firstTurn && combined) setTranslationStatus("Turn translated. The conversation is ready; pass the mic to the other person.");
          else if (combined) setConversationStatus("Turn translated. Pass the mic to the other person.");
        });
      } else void processCapturedSpeech(speaker, firstTurn, transcript);
    };

    setListeningSeconds(0);
    if (firstTurn) setRecognitionActive(true); else setConversationListeningFor(speaker);
    setTranslationStatus(firstTurn ? `Listening in ${translationSourceLanguage}…` : "");
    setConversationStatus(firstTurn ? "" : `Listening in ${speaker === "you" ? translationSourceLanguage : translationTargetLanguage}…`);
    try {
      recognition.start();
    } catch {
      setRecognitionActive(false);
      setConversationListeningFor(null);
      const message = "Couldn’t start the microphone. Check microphone permission and try again.";
      if (firstTurn) setTranslationStatus(message); else setConversationStatus(message);
    }
  }

  function queueLiveSpeechSegment(speaker: "you" | "local", firstTurn: boolean, text: string) {
    if (firstTurn && !firstLiveSegmentHandled.current) {
      firstLiveSegmentHandled.current = true;
      setConversationMode("interpreter");
      setConversationOpen(true);
    }
    if (firstTurn) setTranslationStatus("Translating as you speak…");
    setConversationStatus("Translating as you speak…");
    liveTranslationQueue.current = liveTranslationQueue.current.then(async () => {
      const translated = await translateConversationLine(speaker, text, { speak: false, advanceTurn: false, clearInput: false });
      if (translated) liveTranslationLines.current.push(translated);
    }).catch((error) => {
      const message = error instanceof Error ? error.message : "Could not translate this speech segment.";
      if (firstTurn) setTranslationStatus(message);
      setConversationStatus(message);
    });
  }

  async function startAudioCapture(speaker: "you" | "local", firstTurn: boolean) {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      const message = "This browser cannot record speech. Allow microphone access or use a recent version of Chrome or Safari.";
      if (firstTurn) setTranslationStatus(message); else setConversationStatus(message);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.current = stream;
      audioChunks.current = [];
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioRecorder.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) audioChunks.current.push(event.data); };
      recorder.onerror = () => {
        recorder.onstop = null;
        audioChunks.current = [];
        stream.getTracks().forEach((track) => track.stop());
        audioStream.current = null;
        audioRecorder.current = null;
        setRecognitionActive(false);
        setConversationListeningFor(null);
        const message = "Microphone recording failed. Check microphone access and try again.";
        if (firstTurn) setTranslationStatus(message); else setConversationStatus(message);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        audioStream.current = null;
        audioRecorder.current = null;
        setRecognitionActive(false);
        setConversationListeningFor(null);
        const type = recorder.mimeType || "audio/webm";
        const audio = new Blob(audioChunks.current, { type });
        audioChunks.current = [];
        if (!audio.size) {
          if (firstTurn) setTranslationStatus("No speech was recorded. Tap the microphone and try again.");
          else setConversationStatus("No speech was recorded. Tap the microphone and try again.");
          return;
        }
        if (firstTurn) setTranslationStatus("Recording saved. Transcribing your words…");
        else setConversationStatus("Recording saved. Transcribing this turn…");
        void (async () => {
          try {
            const form = new FormData();
            form.append("audio", audio, "golocal-speech.webm");
            form.append("language", speaker === "you" ? translationSourceLanguage : translationTargetLanguage);
            const response = await fetch("/api/speech", { method: "POST", body: form });
            const result = await response.json() as { transcript?: string; error?: string };
            if (!response.ok) throw new Error(result.error || "Speech could not be transcribed.");
            await processCapturedSpeech(speaker, firstTurn, result.transcript || "");
          } catch (error) {
            const message = error instanceof Error ? error.message : "Speech could not be transcribed.";
            if (firstTurn) setTranslationStatus(message); else setConversationStatus(message);
          }
        })();
      };
      setListeningSeconds(0);
      if (firstTurn) setRecognitionActive(true); else setConversationListeningFor(speaker);
      setTranslationStatus(firstTurn ? `Listening in ${translationSourceLanguage}…` : "");
      setConversationStatus(firstTurn ? "" : `Listening in ${speaker === "you" ? translationSourceLanguage : translationTargetLanguage}…`);
      recorder.start(250);
    } catch (error) {
      audioStream.current?.getTracks().forEach((track) => track.stop());
      audioStream.current = null;
      audioRecorder.current = null;
      setRecognitionActive(false);
      setConversationListeningFor(null);
      const permissionMessage = error instanceof DOMException && error.name === "NotAllowedError"
        ? "Microphone access was denied. Allow it in your browser’s site settings, then try again."
        : "Couldn’t open the microphone. Check that it is connected and not being used by another app.";
      if (firstTurn) setTranslationStatus(permissionMessage); else setConversationStatus(permissionMessage);
    }
  }

  async function processCapturedSpeech(speaker: "you" | "local", firstTurn: boolean, transcript: string) {
    const text = transcript.trim();
    if (!text) {
      if (firstTurn) setTranslationStatus("No speech was recognised. Tap the microphone and try again.");
      else setConversationStatus("No speech was recognised. Tap the microphone and try again.");
      return;
    }
    if (firstTurn) {
      setQuery(text);
      setConversationMode("interpreter");
      setConversationOpen(true);
      setYouMessage(text);
    } else if (speaker === "you") setYouMessage(text);
    else setLocalMessage(text);
    setConversationStatus("Speech captured. Translating the conversation…");
    if (!firstTurn && conversationMode === "roleplay" && speaker === "you") await runAiRoleplay(text);
    else await translateConversationLine(speaker, text);
  }

  async function requestTranslation(text: string) {
    if (!text.trim()) {
      setTranslationStatus("Type or dictate a phrase first.");
      return;
    }
    setTranslateLoading(true);
    setTranslationStatus("");
    try {
      const response = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text.trim(), source: translationSourceLanguage, target: translationTargetLanguage }) });
      const result = await response.json() as { translation?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Translation could not be completed.");
      setTranslatedText(result.translation || "");
      setTranslationStatus("Translated with Gemini.");
    } catch (error) {
      setTranslationStatus(error instanceof Error ? error.message : "Translation could not be completed.");
    } finally { setTranslateLoading(false); }
  }

  function translateInApp() { void requestTranslation(query); }

  async function translateConversationLine(speaker: "you" | "local", text: string, options: { speak?: boolean; advanceTurn?: boolean; clearInput?: boolean } = {}): Promise<string> {
    if (!text.trim() || conversationLoading) return "";
    const source = speaker === "you" ? translationSourceLanguage : translationTargetLanguage;
    const target = speaker === "you" ? translationTargetLanguage : translationSourceLanguage;
    setConversationLoading(true);
    setConversationStatus("");
    try {
      const response = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text.trim(), source, target }) });
      const result = await response.json() as { translation?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Translation could not be completed.");
      setConversationTurns((previous) => [...previous, { id: crypto.randomUUID(), speaker, original: text.trim(), translated: result.translation || "" }]);
      if (options.advanceTurn !== false) setConversationNextSpeaker(speaker === "you" ? "local" : "you");
      if (options.speak !== false && result.translation) speakPhrase(result.translation, target);
      if (options.clearInput !== false) { if (speaker === "you") setYouMessage(""); else setLocalMessage(""); }
      return result.translation || "";
    } catch (error) {
      setConversationStatus(error instanceof Error ? error.message : "Could not translate this message.");
    } finally { setConversationLoading(false); }
    return "";
  }

  async function runAiRoleplay(text: string) {
    if (!text.trim() || conversationLoading) return;
    setConversationLoading(true);
    setConversationStatus("");
    try {
      const response = await fetch("/api/roleplay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), source: translationSourceLanguage, target: translationTargetLanguage, scenario: conversationContext, city: currentStop.city, history: conversationTurns }),
      });
      const result = await response.json() as { travellerLine?: string; reply?: string; meaning?: string; coachTip?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "AI role-play could not continue.");
      setConversationTurns((previous) => [
        ...previous,
        { id: crypto.randomUUID(), speaker: "you", original: text.trim(), translated: result.travellerLine || "" },
        { id: crypto.randomUUID(), speaker: "local", original: result.reply || "", translated: result.meaning || "" },
      ]);
      setConversationStatus(result.coachTip || "You can ask to repeat, slow down, or explain a phrase.");
      setConversationNextSpeaker("you");
      setYouMessage("");
      if (result.reply) speakPhrase(result.reply, translationTargetLanguage);
    } catch (error) {
      setConversationStatus(error instanceof Error ? error.message : "AI role-play could not continue.");
    } finally {
      setConversationLoading(false);
    }
  }

  function bookingSearch() {
    const url = `https://www.google.com/search?q=${encodeURIComponent(`${currentPlace.search} ${currentStop.city} ${currentStop.date} ${tripPurpose} booking`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return <main className={`site-frame ${activeSection === "Journal" ? "journal-frame" : ""}`}>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header className="site-header">
      <Logo />
      <nav className="primary-nav" aria-label="Main navigation">{sectionMeta.map((item) => <button key={item.id} className={`nav-link ${activeSection === item.id ? "active" : ""} ${item.id === "Translate" ? "nav-translate" : ""}`} onClick={() => setActiveSection(item.id)} aria-current={activeSection === item.id ? "page" : undefined}><span className="nav-icon"><Icon name={item.icon} size={18} /></span><span>{item.label}</span></button>)}</nav>
      <div className="header-right"><form className="header-destination-search" onSubmit={searchTripDestination}><Icon name="search" size={18} /><input value={headerSearch} onChange={(event) => setHeaderSearch(event.target.value)} placeholder="Search a place to add to your trip" aria-label="Search for a place to add to your trip" /><button aria-label="Search destinations" type="submit"><Icon name="search" size={17} /></button></form><button className="avatar" onClick={() => { setActiveSection("Account"); setAccountStage("overview"); }} aria-label="Open Sam's account">S</button></div>
    </header>

    {activeSection === "Home" && <div className="home-canvas" id="main-content">
      <section className="home-surface">
        <div className="home-title-row"><div><span className="eyebrow">YOUR GOLOCAL DASHBOARD</span><h1>Good morning, Sam</h1></div><button className="explore-more" onClick={() => setActiveSection("Explore")}>Explore more <span><Icon name="arrow" size={18} /></span></button></div>
        <article className="destination-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(8,28,53,.42),rgba(8,28,53,.05) 82%),linear-gradient(0deg,rgba(6,23,42,.48),transparent 70%),url("${currentStop.image}")` }}>
          <button className="hero-next" onClick={() => setStopIndex((index) => (index + 1) % stops.length)} aria-label="View next trip stop"><Icon name="arrow" size={27} /></button>
          <div className="destination-copy"><span>Your upcoming trip</span><div><h2>{currentStop.city}{currentStop.country && <>, {currentStop.country}</>}</h2><span className="countdown-pill">{currentStop.date === "20–23 Oct" ? "10 Days" : currentStop.date}</span></div></div>
        </article>
        <div className="readiness-meter" aria-label={`Trip preparation ${currentStop.completion}%`}><span style={{ width: `${currentStop.completion}%` }} /><i /></div>
        <section className="trip-dashboard">
          <div className="dashboard-main"><div className="dashboard-label"><span className="status-dot" /> YOUR TRIP, AT A GLANCE</div><h2>Make the most of every stop.</h2><p>Get comfortable with the language, keep your plans close, and find the places that feel like you.</p>
            <div className="trip-facts"><div><small>DATES</small><strong>{currentStop.date}</strong></div><div><small>TRIP STYLE</small><strong>{tripPurpose}</strong></div><div><small>LEARNING</small><strong>{currentStop.language} · {currentStop.completion}% ready</strong></div></div>
            <div className="trip-actions"><button className="button button-green" onClick={() => setActiveSection("Learn")}><Icon name="book" size={17} /> Continue learning <Icon name="arrow" size={16} /></button><button className="button button-soft" onClick={() => openTripEditor(true)}>Change trip details</button></div>
          </div>
          <aside className="readiness-card-v2"><span className="eyebrow">TRIP READINESS</span><div className="readiness-number">{currentStop.completion}<small>%</small></div><p>A little more {currentStop.language} before you go.</p><div className="ready-meter"><i style={{ width: `${currentStop.completion}%` }} /></div><button onClick={() => setActiveSection("Learn")}>See learning plan <Icon name="arrow" size={16} /></button></aside>
        </section>
        <section className="home-lower-grid"><div className="route-card-v2"><div className="lower-heading"><div><span className="eyebrow">YOUR ITINERARY</span><h3>One trip, {stops.length} stops</h3></div><button className="edit-trip-button" onClick={() => openTripEditor(true)}><Icon name="pencil" size={16} /> Edit this trip</button></div><div className="route-strip">{stops.map((stop, index) => <button key={`${stop.city}-${index}`} className={`route-stop ${index === stopIndex ? "route-selected" : ""}`} onClick={() => setStopIndex(index)}><span className="route-stop-photo" style={{ backgroundImage: `linear-gradient(0deg,#0b2a5650,#0b2a5610),url("${stop.image}")` }}><b>0{index + 1}</b></span><span className="route-stop-place"><strong>{stop.city}</strong><small>{stop.country}</small></span><span className="route-stop-date">{stop.date}</span></button>)}<button className="route-add" onClick={() => openTripEditor(false)}><span><Icon name="plus" size={18} /></span><small>Add stop</small></button></div></div><button className="journal-teaser" onClick={() => setActiveSection("Journal")}><span className="eyebrow">YOUR JOURNAL</span><strong>Keep a little note<br />for the way.</strong><span className="journal-teaser-cta">Open journal <Icon name="arrow" size={15} /></span><span className="journal-lines" aria-hidden="true"><Icon name="note" size={34} /></span></button></section>
      </section>
    </div>}

    {activeSection === "Learn" && <div className="page-wrap section-wrap learn-wrap" id="main-content"><section className="learn-trip-controls" aria-label="Learning destination and language"><label>LEARNING FOR<select aria-label="Choose learning destination" value={stopIndex} onChange={(event) => { const next = Number(event.target.value); setStopIndex(next); setExploreLocationIndex(next); setTranslationTargetLanguage(stops[next]?.language || "French"); }}><option value={0}>{stops[0]?.city}, {stops[0]?.country}</option>{stops.slice(1).map((stop, index) => <option key={`${stop.city}-learn`} value={index + 1}>{stop.city}{stop.country ? `, ${stop.country}` : ""}</option>)}</select></label><label>LANGUAGE<select aria-label="Change learning language" value={currentStop.language} onChange={(event) => updateLearningLanguage(event.target.value)}>{supportedLanguages.filter((language) => language !== "English").map((language) => <option key={language}>{language}</option>)}</select></label></section><section className="learning-game-bar"><div className="daily-goal-copy"><span className="kicker">DAILY GOAL · {gamification.dailyXp}/{gamification.dailyGoal} XP</span><strong>One short lesson keeps your progress moving.</strong><div className="daily-goal-meter"><i style={{ width: `${Math.min(100, Math.round(gamification.dailyXp / gamification.dailyGoal * 100))}%` }} /></div></div><div className="game-stat"><strong>{gamification.streak}</strong><span>day streak</span></div><div className="game-stat xp-stat"><strong>{gamification.xp}</strong><span>total XP</span></div><label className="goal-picker">DAILY TARGET<select value={gamification.dailyGoal} onChange={(event) => setGamification((profile) => ({ ...profile, dailyGoal: Number(event.target.value) }))}><option value={20}>Casual · 20 XP</option><option value={50}>Regular · 50 XP</option><option value={100}>Serious · 100 XP</option></select></label></section><p className="learning-api-status" role="status">{apiStatus}</p><section className="learn-hero"><div><span className="kicker">YOUR {currentStop.language.toUpperCase()} LEARNING PATH</span><h1>{minutesRemaining} minutes left to master {currentStop.city}{currentStop.country ? `, ${currentStop.country}` : ""}.</h1><p>Short, useful practice for the places and people waiting on your trip.</p></div><div className="learn-hero-progress"><strong>{currentStop.completion}%</strong><div className="learn-progress"><i style={{ width: `${currentStop.completion}%` }} /></div><span>Trip-ready words</span></div></section><div className="learn-layout"><div className="learn-main"><section className="next-situation-card"><div className="next-situation-copy"><span className="eyebrow">UP NEXT · 5 MIN</span><h2>{nextLesson}</h2><p>Practise the words you’ll actually use in {currentStop.city}.</p><button className="button button-primary" onClick={() => void startBackendLesson(apiPlan?.ranked_situations[0]?.situation_key || "Greetings")}>Start next situation <Icon name="arrow" size={16} /></button></div><ProfGogo /></section><section className="learning-progress-panel"><div className="learning-progress-heading"><div><span className="kicker">YOUR TRIP PLAN</span><h2>{currentStop.language} for {currentStop.city}</h2></div><strong>{currentStop.completion}% <small>ready</small></strong></div><div className="learning-progress"><i style={{ width: `${currentStop.completion}%` }} /></div><div className="learning-progress-label"><span>{minutesRemaining} minutes of practice left</span><span>{currentStop.completion}% complete</span></div></section><div className="learn-section-title"><div><span className="kicker">BUILT AROUND YOUR TRIP</span><h2>Choose a situation</h2></div><button className="quiet-button" onClick={() => openTripEditor(true)}>Change trip style <Icon name="arrow" size={15} /></button></div><div className="course-list">{learningModules.map((module) => { const moduleKey = `module:${currentStop.city}:${currentStop.language}:${module.situation_key}`; const completion = lessonProgress[moduleKey] || 0; const icon = module.situation_key.toLowerCase().includes("restaurant") ? "cup" : module.situation_key.toLowerCase().includes("transport") ? "transit" : module.situation_key.toLowerCase().includes("shopping") ? "market" : "people"; return <article key={`${currentStop.city}-${module.situation_key}`} className={`course-row module-course-row ${completion ? "module-complete" : ""}`}><span className="module-level">LEVEL {String(module.rank).padStart(2, "0")}</span><span className="course-illustration"><Icon name={icon} size={27} /></span><span className="course-copy"><strong>{module.label}</strong><small>{module.priority} priority · {module.concepts.slice(0, 2).join(" · ")}</small><span className="module-progress"><i style={{ width: `${completion}%` }} /></span></span><span className="course-length">{completion ? "Done" : "+20 XP"}</span><button className="save-mini-action" aria-label={`Save ${module.label} to your journal`} onClick={() => saveLessonToJournal(module.label, `GoLocal learning module · ${currentStop.city} · ${module.concepts.join(", ")}`)}><Icon name="bookmark" size={17} /></button><button className="course-arrow" aria-label={`Start ${module.label}`} onClick={() => void startBackendLesson(module.situation_key)}>→</button></article>; })}</div></div><aside className="coach-panel"><div className="coach-panel-head"><ProfGogo /><span className="kicker">PROF GOGO</span><span className="preview-tag">YOUR TUTOR</span></div><h2>A lesson for the moment you choose.</h2><p>Describe one real moment from your trip and Prof GoGo will build a focused practice module in {currentStop.language}.</p><div className="coach-welcome">Tell Prof GoGo the moment you want to practise, such as “order an oat milk coffee” or “ask where the metro is”. You’ll get a focused mini lesson with useful phrases, pronunciation, a try-it prompt and a local-use tip.</div>{coachMessages.map((message, index) => <div key={`${message.role}-${index}`} className={`coach-message ${message.role === "user" ? "coach-user" : "coach-answer"}`}>{message.moduleTitle && <strong className="coach-module-title">{message.moduleTitle}</strong>}{message.content}</div>)}{coachLoading && <div className="coach-message coach-answer" role="status">Prof GoGo is thinking…</div>}{coachError && <div className="coach-error" role="alert">{coachError}</div>}<div className="coach-prompts"><button onClick={() => setCoachPrompt("Help me order a coffee in a café.")}><Icon name="cup" size={16} /> Café practice</button><button onClick={() => setCoachPrompt("Help me ask for directions.")}><Icon name="pin" size={16} /> Ask directions</button><button onClick={() => setCoachPrompt("Help me plan a night out with friends.")}><Icon name="music" size={16} /> Night out</button></div><form className="coach-input" onSubmit={sendCoach}><input value={coachPrompt} onChange={(event) => setCoachPrompt(event.target.value)} placeholder="Ask Prof GoGo…" aria-label="Ask Prof GoGo" /><button aria-label="Send question" disabled={coachLoading}><Icon name="arrow" size={17} /></button></form><small className="preview-note">Personalized lessons use Gemini · GEMINI_API_KEY in .env.local</small></aside></div></div>}

    {activeSection === "Translate" && <div className="page-wrap section-wrap translate-wrap" id="main-content"><section className="section-intro translate-intro"><span className="kicker">YOUR EVERYDAY TRAVEL INTERPRETER</span><h1>Say it. We’ll find the words.</h1><p>Tap the microphone to start a timer and speak. When you stop, GoLocal opens the conversation and translates your first turn.</p></section><section className="conversation-launch"><div><span className="kicker">IN THE MOMENT</span><h2>Need to talk with someone nearby?</h2><p>Choose live translation or practise a scenario with GoLocal’s AI voice partner.</p></div><label>WHAT’S HAPPENING?<select value={conversationContext} onChange={(event) => setConversationContext(event.target.value)}><option>At a café</option><option>At a restaurant</option><option>Asking for directions</option><option>Meeting someone</option><option>At a shop</option><option>Something else</option></select></label><div className="conversation-launch-actions">{conversationOpen && <button className="button button-soft" onClick={closeConversation}>Close</button>}<button className="button button-primary" onClick={() => { setConversationMode("interpreter"); setConversationOpen(true); }}>Open interpreter</button><button className="button button-green" onClick={() => { setConversationMode("roleplay"); setConversationOpen(true); }}>AI voice role-play</button></div></section>{conversationOpen && <section className="conversation-panel" aria-label="Translated conversation"><div className="conversation-heading"><div><span className="kicker">{conversationContext.toUpperCase()}</span><h2>{conversationMode === "roleplay" ? `AI role-play · ${translationSourceLanguage} ↔ ${translationTargetLanguage}` : `${translationSourceLanguage} ↔ ${translationTargetLanguage}`}</h2><p className="conversation-turn-indicator">Next turn: <strong>{conversationNextSpeaker === "you" ? "you" : "the other person"}</strong></p></div><button className="quiet-button" onClick={() => { setConversationTurns([]); setConversationNextSpeaker("you"); setConversationStatus(""); }}>Clear conversation</button></div><div className="conversation-transcript" aria-live="polite">{conversationTurns.length ? conversationTurns.map((turn) => <article key={turn.id} className={`conversation-bubble ${turn.speaker === "you" ? "bubble-you" : "bubble-local"}`}><small>{turn.speaker === "you" ? "YOU" : "THEM"} · {turn.speaker === "you" ? translationSourceLanguage : translationTargetLanguage}</small><p>{turn.original}</p><span>{turn.translated}</span></article>) : <p className="conversation-empty">Tap your mic, speak, then tap it again to finish your turn. GoLocal will translate and read it aloud; then pass the mic to the other person.</p>}</div><div className="conversation-inputs"><form onSubmit={(event) => { event.preventDefault(); void (conversationMode === "roleplay" ? runAiRoleplay(youMessage) : translateConversationLine("you", youMessage)); }}><label htmlFor="say-to-them">WHAT YOU WANT TO SAY <small>{translationSourceLanguage}</small></label><textarea id="say-to-them" value={youMessage} onChange={(event) => setYouMessage(event.target.value)} placeholder="Could I have a table for two?" rows={2} /><div className="conversation-form-actions"><button type="button" className={`conversation-mic ${conversationListeningFor === "you" ? "is-listening" : ""} ${conversationNextSpeaker === "you" ? "is-next-speaker" : ""}`} aria-label="Start or finish your speaking turn" onClick={() => startConversationSpeech("you")} disabled={conversationListeningFor !== null && conversationListeningFor !== "you"} aria-pressed={conversationListeningFor === "you"}><Icon name="mic" size={17} /> {conversationListeningFor === "you" ? `Listening · ${formatListeningTime(listeningSeconds)} · tap to finish` : conversationNextSpeaker === "you" ? "Start your mic" : "Your mic"}</button><button className="button button-primary" disabled={conversationLoading || !youMessage.trim()}>{conversationMode === "roleplay" ? "Send your line" : "Translate for them"} <Icon name="arrow" size={15} /></button></div></form><form onSubmit={(event) => { event.preventDefault(); void translateConversationLine("local", localMessage); }}><label htmlFor="they-said">WHAT THEY SAID <small>{translationTargetLanguage}</small></label><textarea id="they-said" value={localMessage} onChange={(event) => setLocalMessage(event.target.value)} placeholder="Type what you heard…" rows={2} /><div className="conversation-form-actions"><button type="button" className={`conversation-mic ${conversationListeningFor === "local" ? "is-listening" : ""} ${conversationNextSpeaker === "local" ? "is-next-speaker" : ""}`} aria-label="Start or finish the other person’s speaking turn" onClick={() => startConversationSpeech("local")} disabled={conversationMode === "roleplay" || (conversationListeningFor !== null && conversationListeningFor !== "local")} aria-pressed={conversationListeningFor === "local"}><Icon name="mic" size={17} /> {conversationListeningFor === "local" ? `Listening · ${formatListeningTime(listeningSeconds)} · tap to finish` : conversationMode === "roleplay" ? "AI reply" : conversationNextSpeaker === "local" ? "Other person’s mic" : "Other person’s mic"}</button><button className="button button-soft" disabled={conversationLoading || !localMessage.trim()}>Translate for me <Icon name="arrow" size={15} /></button></div></form></div><aside className="conversation-cues"><strong>Conversation cues</strong><p>Translations can’t determine someone’s intent. If they give short replies, step away, or say they need to go, consider giving them space and ending politely.</p></aside>{conversationStatus && <p role="status" className="translation-status">{conversationStatus}</p>}<small className="preview-note">{conversationMode === "roleplay" ? "Gemini creates a fictional practice reply. It cannot assess a real person’s intentions." : "Speech is transcribed by Gemini when browser speech recognition is unavailable. GoLocal does not save the recording."}</small></section>}<div className="translator-layout"><section className="translator-card"><div className="translator-language"><label><small>FROM</small><select aria-label="Translate from" value={translationSourceLanguage} onChange={(event) => setTranslationSourceLanguage(event.target.value)}>{supportedLanguages.map((language) => <option key={language}>{language}</option>)}</select></label><button aria-label="Swap languages" onClick={() => { setTranslationSourceLanguage(translationTargetLanguage); setTranslationTargetLanguage(translationSourceLanguage); setTranslatedText(""); }}><Icon name="swap" size={19} /></button><label><small>TO</small><select aria-label="Translate to" value={translationTargetLanguage} onChange={(event) => setTranslationTargetLanguage(event.target.value)}>{supportedLanguages.filter((language) => language !== translationSourceLanguage).map((language) => <option key={language}>{language}</option>)}</select></label></div><div className="hold-speak-wrap"><button className={`hold-speak-button ${recognitionActive ? "mic-listening" : ""}`} onClick={startSpeechInput} type="button" aria-label={recognitionActive ? "Stop microphone" : "Start conversation with microphone"} aria-pressed={recognitionActive}><span><Icon name="mic" size={27} /></span><strong>{recognitionActive ? "Listening · tap to finish" : "Start conversation"}</strong><small>{recognitionActive ? formatListeningTime(listeningSeconds) : "Tap to start the mic and timer"}</small></button></div><label className="translate-label" htmlFor="translation-input">Or type a phrase</label><textarea id="translation-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="I’d like a table for four…" maxLength={500} /><div className="translator-controls"><span>{query.length}/500</span></div><div className="translator-bottom"><button className="button button-primary" onClick={translateInApp} type="button" disabled={translateLoading}>{translateLoading ? "Translating…" : "Translate in GoLocal"} <Icon name="arrow" size={16} /></button><span>Gemini translation · stays in this app</span></div>{translatedText && <div className="translated-result"><span className="eyebrow">IN {translationTarget.toUpperCase()}</span><p>{translatedText}</p><button className="text-action" onClick={() => addJournalEntry(`Phrase · ${currentStop.city}`, `${query.trim()}\n${translatedText}\n\n${translationTarget} · ${currentStop.city}`)}><Icon name="bookmark" size={16} /> Save phrase to Journal</button></div>}{translationStatus && <p className="translation-status" role="status">{translationStatus}</p>}</section><aside className="phrase-side"><span className="kicker">QUICK PHRASES FOR {currentStop.city.toUpperCase()}</span><h2>Keep a phrase close.</h2><p className="offline-pack-status"><Icon name="bookmark" size={15} /> {offlinePhraseCount} trip phrases saved on this device for offline access.</p>{destinationPhrases.map((item) => <article className="phrase-row" key={item.context}><button className="phrase-select" onClick={() => { setTranslationSourceLanguage("English"); setTranslationTargetLanguage(currentStop.language); setQuery(item.source); setTranslatedText(item.phrase); }}><span><small>{item.context}</small><strong>{item.phrase}</strong><em>{item.source}</em></span></button><button className="phrase-save" aria-label={`Save ${item.context} to Journal`} onClick={() => savePhraseToJournal(item)}><Icon name="plus" size={18} /></button></article>)}<p className="translation-note">Add any phrase to your trip notes with one tap.</p></aside></div></div>}

    {activeSection === "Explore" && <div className="page-wrap section-wrap explore-wrap" id="main-content"><section className="section-intro explore-intro"><div><span className="kicker">IDEAS FOR THIS PART OF YOUR TRIP</span><h1>Find the places you’ll talk about later.</h1><p>Pick your stop and trip mood. We’ll surface a small, swipeable shortlist that fits.</p></div><button className="button button-soft" onClick={() => setPostOpen(true)}><Icon name="plus" size={17} /> Make a post</button></section><section className="explore-controls"><label><span>SHOW PLACES IN</span><select aria-label="Choose trip stop for Explore" value={exploreLocationIndex} onChange={(event) => { setExploreLocationIndex(Number(event.target.value)); setPlaceIndex(0); }}>{stops.map((stop, index) => <option key={`${stop.city}-explore`} value={index}>{stop.city}{stop.country ? `, ${stop.country}` : ""}</option>)}</select></label><div><span>WHAT KIND OF TRIP?</span><div className="explore-filters">{tripTypes.slice(0,4).map((type) => <button type="button" key={type} className={tripPurpose === type ? "vibe-active" : ""} onClick={() => setTripPurpose(type)}>{type}</button>)}<button type="button" onClick={() => openTripEditor(true)}><Icon name="plus" size={16} /> Edit trip preferences</button></div></div></section>{postMessage && <p className="community-status" role="status">{postMessage}</p>}<div className="explore-layout"><article className={`swipe-card ${swipeDirection ? `swipe-${swipeDirection}` : ""}`} key={currentPlace.id}><div className="swipe-photo" onTouchStart={(event) => { swipeStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => handleCardSwipe(event.changedTouches[0]?.clientX ?? 0)} style={{ backgroundImage: `linear-gradient(0deg,rgba(8,22,37,.88),rgba(8,22,37,.06) 72%),url("${currentPlace.image}")` }}><div className="place-type">{currentPlace.kind}<span className="for-your-trip">FOR YOUR TRIP · {exploreStop.city.toUpperCase()}</span></div><div className="swipe-copy"><span className="place-area"><Icon name="pin" size={16} /> {currentPlace.area}</span><h2>{currentPlace.title}</h2><p>{currentPlace.description}</p><div className="place-tags">{currentPlace.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>{currentPlace.link && <a className="swipe-source-link" href={currentPlace.link} target="_blank" rel="noreferrer">Open the place link <Icon name="arrow" size={14} /></a>}</div></div><div className="swipe-actions"><button className="hinge-pass" onClick={skipCurrentPlace}><span><Icon name="x" size={20} /></span> Pass</button><span className="swipe-hint">Swipe left to pass · right to save</span><button className="hinge-save" onClick={saveCurrentPlace}><span><Icon name="heart" size={20} /></span> Save</button></div></article><aside className="explore-info"><span className="kicker">CURATED FOR {exploreStop.city.toUpperCase()}</span><h2>More local, less listicle.</h2><p>Save a place with the heart, or pass it to see what’s next. Saved ideas stay here and can be added to Journal.</p><div className="booking-note"><span><Icon name="arrow" size={18} /></span><div><strong>Make it part of the plan</strong><small>See current listings and ticket options near {exploreStop.city}.</small></div></div><button className="button button-primary booking-button" onClick={bookingSearch}>Check booking options <Icon name="arrow" size={16} /></button><div className="card-count">CARD {String(placeIndex % matchedPlaces.length + 1).padStart(2, "0")} <span>OF {String(matchedPlaces.length).padStart(2, "0")}</span></div></aside></div><section className="explore-saved-section"><div className="explore-saved-heading"><div><span className="eyebrow">SAVED FOR THIS TRIP</span><h2>Your shortlist</h2></div><span>{saved.length} saved</span></div>{saved.length ? <div className="saved-grid">{saved.map((place) => <article className="saved-card" key={place.id}><div style={{ backgroundImage: `url("${place.image}")` }} /><span className="kicker">{place.kind}</span><h2>{place.title}</h2><p>{place.area}</p><button onClick={() => savePlaceToJournal(place)}><Icon name="note" size={15} /> Add to Journal</button></article>)}</div> : <div className="explore-save-empty">Your trip shortlist lives here. Tap Save on a card to keep it for later.</div>}</section><section className="story-shelf"><div className="explore-saved-heading"><div><span className="eyebrow">TRAVEL EDITORS & LOCAL VOICES</span><h2>Read into {exploreStop.city}</h2></div><span>Stories picked for your trip</span></div><div className="story-grid">{travelStories.filter((story) => story.city.toLowerCase() === exploreStop.city.toLowerCase()).map((story) => <article className="story-card" key={story.title}><div style={{ backgroundImage: `url("${story.image}")` }} /><div><span className="kicker">{story.source}</span><h3>{story.title}</h3><p>{story.text}</p><a href={story.href} target="_blank" rel="noreferrer">Read the story <Icon name="arrow" size={15} /></a></div></article>)}</div>{!travelStories.some((story) => story.city.toLowerCase() === exploreStop.city.toLowerCase()) && <p className="story-disclaimer">Editorial previews for {exploreStop.city} are not connected yet. <a href={"https://www.instagram.com/explore/tags/" + encodeURIComponent(exploreStop.city.replaceAll(" ", "").toLowerCase()) + "/"} target="_blank" rel="noreferrer">Browse public Instagram Reels</a> for this destination.</p>}<p className="story-disclaimer">Previews link to their original publishers. Instagram results open publicly on Instagram; GoLocal does not copy or embed creator content.</p></section></div>}

    {activeSection === "Journal" && <div className="page-wrap section-wrap journal-wrap" id="main-content"><section className="section-intro journal-intro"><div><span className="kicker">A NOTEBOOK FOR YOUR REAL TRIP</span><h1>Your journal.</h1><p>Keep plans, phrases, places, links and pictures together — like a travel-ready Notes app.</p></div><button className="button button-primary" onClick={addJournalNote}><Icon name="plus" size={16} /> New note</button></section><section className="journal-app"><aside className="journal-sidebar"><div className="journal-sidebar-top"><label className="journal-search"><Icon name="search" size={16} /><input value={journalSearch} onChange={(event) => setJournalSearch(event.target.value)} placeholder="Search notes" aria-label="Search notes" /></label><button onClick={addJournalNote} aria-label="Create a new note"><Icon name="plus" size={18} /></button></div><p>{visibleNotes.length} NOTES <span>· On this device</span></p><div className="journal-list">{visibleNotes.map((note) => <button key={note.id} className={`journal-list-item note-${note.color} ${activeNoteId === note.id ? "selected" : ""}`} onClick={() => setActiveNoteId(note.id)}><strong>{note.title || "Untitled note"}</strong><small>{note.updatedAt}</small><span>{note.body.slice(0, 88) || "No additional text"}</span></button>)}{visibleNotes.length === 0 && <div className="journal-empty-list">No notes found. Start one with the + button.</div>}</div><div className="journal-saved-tools"><strong>TRIP QUICK SAVES</strong><button onClick={() => setActiveSection("Learn")}><Icon name="book" size={15} /> Learning situations</button><button onClick={() => setActiveSection("Translate")}><Icon name="mic" size={15} /> Downloaded phrases · {offlinePhraseCount}</button><button onClick={() => setActiveSection("Explore")}><Icon name="heart" size={15} /> Explore shortlist ({saved.length})</button></div></aside><div className={`journal-editor note-${activeNote?.color || "butter"}`}>{activeNote ? <><div className="journal-editor-actions"><span>Edited {activeNote.updatedAt.toLowerCase()}</span><button onClick={deleteJournalNote}>Delete note</button></div><input className="journal-title-input" value={activeNote.title} onChange={(event) => updateJournalNote("title", event.target.value)} aria-label="Note title" placeholder="Title" /><textarea className="journal-body-input" value={activeNote.body} onChange={(event) => updateJournalNote("body", event.target.value)} aria-label="Note text" placeholder="Start writing…" /><div className="note-attachments">{(activeNote.attachments || []).map((attachment) => attachment.kind === "image" ? <a className="note-attachment-image" href={attachment.url} target="_blank" rel="noreferrer" key={attachment.id}><Image src={attachment.url} width={100} height={78} unoptimized alt={attachment.label} /><span>{attachment.label}</span></a> : <a className="note-attachment-link" href={attachment.url} target="_blank" rel="noreferrer" key={attachment.id}><Icon name="link" size={15} /> {attachment.label}</a>)}</div><div className="journal-tools"><button className="note-tool-button" onClick={() => imageInput.current?.click()}><Icon name="image" size={16} /> Add picture</button><label className="note-link-input"><Icon name="link" size={16} /><input value={journalLink} onChange={(event) => setJournalLink(event.target.value)} placeholder="Paste a link" aria-label="Link to attach" /><button onClick={attachLinkToNote} type="button">Attach</button></label><input ref={imageInput} className="visually-hidden" type="file" accept="image/*" multiple onChange={importJournalImages} /></div>{journalMessage && <p className="journal-message" role="status">{journalMessage}</p>}<span className="journal-storage-hint">Notes and attached links are saved on this device. Image imports are local to this browser.</span></> : <div className="journal-empty-editor"><span className="coach-spark"><Icon name="note" size={25} /></span><h2>A place for the small things.</h2><p>Make a note of a place, a phrase, or a moment you don’t want to lose.</p><button className="button button-primary" onClick={addJournalNote}>Create a note</button></div>}</div></section></div>}

    {activeSection === "Account" && <div className="page-wrap section-wrap account-wrap" id="main-content"><section className="section-intro"><span className="kicker">YOUR GOLOCAL ACCOUNT</span><h1>Your trips, your way.</h1><p>Manage your profile, trip preferences and learning goals in one place.</p></section>{accountStage === "overview" && <div className="account-grid"><section className="account-profile-card"><div className="account-avatar-large">S</div><div><span className="eyebrow">TRAVELLER PROFILE</span><h2>Sam</h2><p>{accountEmail || "Add an email address to sync your travel plans."}</p></div><button className="button button-primary" onClick={() => setAccountStage("login")}>Sign in</button></section><section className="account-preferences-card"><span className="kicker">YOUR TRIP PERSONALITY</span><h2>{tripPurpose}</h2><p>{selectedInterests.join(" · ")}</p><button className="button button-soft" onClick={() => { setPersonalityAnswers(["", "", ""]); setAccountStage("questions"); }}>Retake the 3 questions</button></section><section className="account-security-card"><Icon name="bookmark" size={23} /><div><strong>Sign in and sync your plans</strong><p>Connect a secure identity provider to enable email OTP and authenticator-based two-step verification.</p><button className="text-action" onClick={() => { setPersonalityAnswers(["", "", ""]); setAccountStage("questions"); }}>Create account <Icon name="arrow" size={15} /></button></div></section><section className="account-summary-card"><span className="kicker">YOUR GOLOCAL</span><div className="account-summary-stats"><div><strong>{stops.length}</strong><span>trip stops</span></div><div><strong>{saved.length}</strong><span>saved places</span></div><div><strong>{notes.length}</strong><span>journal notes</span></div></div><p>Your current prototype data stays in this browser.</p></section></div>}{accountStage === "questions" && <section className="auth-card"><span className="kicker">FIRST, WHAT FEELS LIKE YOU?</span><h2>Three quick questions for better trip ideas.</h2><p>We use your answers to tune places and the language situations we suggest.</p>{[{q:"What do you want more of?",choices:["Food","Nightlife","Nature","Museums"]},{q:"How do you like to travel?",choices:["Go with the flow","Plan ahead","Follow local tips"]},{q:"Your ideal evening?",choices:["A lively night out","A long dinner","A quiet sunset"]}].map((question,index)=><fieldset className="personality-question" key={question.q}><legend><span>0{index+1} / 03</span>{question.q}</legend><div>{question.choices.map((choice)=><button type="button" className={personalityAnswers[index]===choice?"answer-selected":""} key={choice} onClick={()=>answerTripQuestion(index,choice)}>{choice}</button>)}</div></fieldset>)}<p className="auth-prototype-note">Choose one answer in each row to continue.</p></section>}{(accountStage === "signup" || accountStage === "login") && <section className="auth-card"><button className="auth-back" onClick={()=>setAccountStage(accountStage==="signup"?"questions":"overview")}>← Back</button><span className="kicker">{accountStage==="signup"?"CREATE YOUR ACCOUNT":"WELCOME BACK"}</span><h2>{accountStage==="signup"?"Keep your trip close.":"Sign in to GoLocal."}</h2><p>We’ll use an email one-time code, followed by a second verification step in the connected account provider.</p><form className="auth-form" onSubmit={continueAuth}><label>Email address<input required type="email" name="email" placeholder="you@example.com" autoComplete="email" /></label><button className="button button-primary" type="submit">Continue to verification <Icon name="arrow" size={16} /></button></form><p className="auth-prototype-note">This prototype does not send email or codes yet. Secure OTP and 2FA require an auth provider.</p></section>}{accountStage === "otp" && <section className="auth-card"><button className="auth-back" onClick={()=>setAccountStage("login")}>← Back</button><span className="kicker">TWO-STEP VERIFICATION PREVIEW</span><h2>Verify it’s you.</h2><p>For <strong>{accountEmail}</strong>, the live product will request an email code, then a six-digit authenticator code.</p><div className="otp-preview-fields"><label>Email code<input inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" maxLength={6} /></label><label>Authenticator code<input inputMode="numeric" placeholder="6-digit code" maxLength={6} /></label></div><button className="button button-primary" onClick={()=>{setAccountStage("overview");setAccountMessage("Flow preview complete. No code was sent or verified; connect your auth provider to enable sign-in.");}}>Finish preview</button><p className="auth-prototype-note">{accountMessage}</p></section>}{accountMessage && accountStage==="overview" && <p className="community-status" role="status">{accountMessage}</p>}</div>}

    <footer className="site-footer"><span>© GoLocal · Go Local, Feel Local</span><span>Trips with a little more belonging.</span></footer>

    {postOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setPostOpen(false);}}><section className="trip-modal" role="dialog" aria-modal="true" aria-labelledby="post-modal-title"><div className="modal-top"><div><span className="kicker">COMMUNITY PLACE REVIEW</span><h2 id="post-modal-title">Make a post</h2></div><button className="modal-close" onClick={()=>setPostOpen(false)} aria-label="Close">×</button></div><p>Tell us why this place is worth sharing. Our team will review authenticity; approved community posts may qualify for GoLocal vouchers.</p><form onSubmit={submitCommunityCard}><label>Place or event<input name="cardTitle" placeholder="The little jazz bar we found" required /></label><label>Why should another traveller go?<textarea name="cardDetails" rows={3} placeholder="Add a short tip, best time to go or what you loved…" required /></label><label>Link (optional)<input name="cardLink" type="url" placeholder="https://" /></label><button className="button button-primary modal-submit">Save post draft <Icon name="arrow" size={16} /></button></form></section></div>}

    {activeLesson && <div className="modal-backdrop lesson-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveLesson(null); }}><section className="trip-modal lesson-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-modal-title"><div className="modal-top"><div><span className="kicker">LEVEL {activeLesson.level} · {lessonQuestionIndex + 1} OF {activeLesson.exercises.length}</span><h2 id="lesson-modal-title">{activeLesson.title}</h2></div><button className="modal-close" onClick={() => setActiveLesson(null)} aria-label="Close lesson">×</button></div><p>{activeLesson.introduction}</p><div className="lesson-vocabulary">{activeLesson.vocabulary.slice(0, 3).map((word) => <article key={word.target}><button aria-label={`Listen to ${word.target}`} onClick={() => speakPhrase(word.target, currentStop.language)}><Icon name="sound" size={15} /></button><div><strong>{word.target}</strong><span>{word.translation}</span></div></article>)}</div><section className="lesson-question"><span className="eyebrow">PRACTICE · {lessonCorrectCount} CORRECT SO FAR</span><h3>{activeLesson.exercises[lessonQuestionIndex]?.prompt}</h3>{activeLesson.exercises[lessonQuestionIndex]?.options.length ? <div className="lesson-answer-options">{activeLesson.exercises[lessonQuestionIndex].options.map((option) => <button type="button" key={option} className={lessonAnswer === option ? "lesson-answer-selected" : ""} onClick={() => setLessonAnswer(option)}>{option}</button>)}</div> : <input value={lessonAnswer} onChange={(event) => setLessonAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void checkBackendAnswer(); }} placeholder="Type your answer" aria-label="Your answer" />}{lessonFeedback && <p className={`lesson-feedback ${lessonFeedback.startsWith("Correct!") ? "lesson-feedback-correct" : ""}`} role="status">{lessonFeedback}</p>}</section><div className="lesson-modal-actions">{lessonFeedback ? <button className="button button-primary" onClick={advanceBackendLesson} disabled={lessonLoading}>{lessonQuestionIndex + 1 < activeLesson.exercises.length ? "Next question" : `Finish lesson · +${lessonProgress[activeLesson.lesson_id] ? 0 : 20} XP`} <Icon name="arrow" size={16} /></button> : <button className="button button-primary" onClick={() => void checkBackendAnswer()} disabled={lessonLoading || !lessonAnswer.trim()}>{lessonLoading ? "Checking…" : "Check answer"} <Icon name="arrow" size={16} /></button>}</div><small className="modal-disclaimer">Lesson answers are checked by the GoLocal learning service. Your XP and completion stay on this device.</small></section></div>}

    {tripOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTripOpen(false); }}><section className="trip-modal" role="dialog" aria-modal="true" aria-labelledby="trip-modal-title"><div className="modal-top"><div><span className="kicker">MAKE IT YOURS</span><h2 id="trip-modal-title">{editingTrip ? "Edit this trip" : "Plan a trip"}</h2></div><button className="modal-close" onClick={() => setTripOpen(false)} aria-label="Close">×</button></div><p>Tell us what this trip feels like. Your learning situations and Explore shortlist will adjust to the trip mood.</p><form onSubmit={createTrip}><label>Where are you going?<input name="destination" value={tripDestination} onChange={(event) => setTripDestination(event.target.value)} placeholder="e.g. Lisbon" required /></label><div className="trip-date-grid"><label>Arrival<input name="startDate" type="date" /></label><label>Departure<input name="endDate" type="date" /></label></div><label>Language<select name="language" value={tripLanguage} onChange={(event) => setTripLanguage(event.target.value)}>{supportedLanguages.filter((language) => language !== "English").map((language) => <option key={language}>{language}</option>)}</select></label><label>What kind of trip?<select value={tripPurpose} onChange={(event) => setTripPurpose(event.target.value)}>{tripTypes.map((type)=><option key={type}>{type}</option>)}<option>Work trip</option><option>Romantic escape</option></select></label><div className="interest-label">What would you like to do?</div><div className="interest-options">{interests.map((interest) => <button type="button" key={interest} className={selectedInterests.includes(interest) ? "interest-selected" : ""} onClick={() => toggleInterest(interest)}>{selectedInterests.includes(interest) && <span aria-hidden="true">✓</span>}{interest}</button>)}</div><button className="button button-primary modal-submit" type="submit">{editingTrip ? "Save trip changes" : "Save trip preferences"} <Icon name="arrow" size={16} /></button><small className="modal-disclaimer">Trip details currently stay in this browser. Connect a backend to sync them across devices.</small></form></section></div>}
    {showSplash && <div className="brand-splash" role="status" aria-label="Loading GoLocal"><Image src="/golocal-mark.png" alt="" width={82} height={76} priority /><strong>GoLocal</strong><span>Getting your trip in view</span><i /></div>}
  </main>;
}
