/**
 * lib/crew-day.ts — the PACK CREW's daily responsibility checklist (v1: MONDAY).
 *
 * Todd wrote this list because the pack crew has been missing responsibilities
 * (source of truth: apps/csa-portal/PACK_CREW_CHECKLISTS.md — Monday section,
 * Todd-approved 2026-08-15). It is rendered as a LIVE check-off surface at
 * /admin/checklist, backed by pick_pack_progress with section='crew_day'
 * (migration 0092) — the same table, endpoints, realtime and RLS the Pick & Pack
 * board already uses. This file is the CONTENT; there is deliberately no admin
 * UI for editing it, because a wording change is a two-line PR.
 *
 * ── TASK KEYS ARE STABLE, FOREVER ────────────────────────────────────────────
 * `key` IS the DB `line_key`. Renaming or renumbering a key ORPHANS every row
 * already saved under the old key (the tick, the worker name, and — on the lunch
 * row — Ben's flagged items). Change the EN/ES text freely; never change a key.
 * A task that is retired should be REMOVED, not renumbered.
 *
 * ── SPANISH ──────────────────────────────────────────────────────────────────
 * Two of the intended readers are H-2A Spanish speakers. Per
 * docs/research/PACKHOUSE_HANDOFF_RESEARCH_2026.md §5.2 the Spanish here is a
 * CONSENSUS translation in plain Mexican-agricultural Spanish (the regional
 * vocabulary this crew actually uses — "tarima" for pallet, "jalador" for
 * squeegee, "coladeras" for drains, "composta" for compost, "báscula" for
 * scale), NOT a literal word-for-word rendering of the English. Instructions use
 * the usted form, matching the rest of the crew-facing pages (pick-pack, cooler).
 *
 * ── ORDERING ─────────────────────────────────────────────────────────────────
 * morning → lunch → afternoon → closedown. The order IS the workflow: the day is
 * read top to bottom, and MONDAY_TASKS is already in that order.
 */

/** The four bands of the pack day, in the order they happen. */
export type CrewDayGroup = 'morning' | 'lunch' | 'afternoon' | 'closedown';

export interface CrewTask {
  /** STABLE. Never renumber — it is the DB line_key. */
  key: string;
  /** English task text. */
  en: string;
  /** Spanish task text (consensus farm Spanish, not machine-literal). */
  es: string;
  /** Which band of the day the task belongs to. */
  group: CrewDayGroup;
  /**
   * Shows the "flag a missing item" control on this row (v1: only
   * `mon.lunch.tell_ben`). A flag appends the item to the row's `note` and
   * writes the typed quantity to `needed_qty`, so Ben can still harvest it.
   */
  flaggable?: boolean;
}

/** Group order — the workflow order. Drives rendering; do not re-sort. */
export const CREW_DAY_GROUP_ORDER: readonly CrewDayGroup[] = [
  'morning',
  'lunch',
  'afternoon',
  'closedown',
] as const;

/** Band headings, EN + ES. */
export const CREW_DAY_GROUP_LABELS: Record<CrewDayGroup, { en: string; es: string }> = {
  morning: {
    en: 'Morning — priority packs (must ship complete)',
    es: 'Mañana — empaques prioritarios (tienen que salir completos)',
  },
  lunch: {
    en: 'Lunchtime checkpoint',
    es: 'Revisión a la hora del almuerzo',
  },
  afternoon: {
    en: 'Afternoon',
    es: 'Tarde',
  },
  closedown: {
    en: 'End of day — close-down (non-negotiable)',
    es: 'Fin del día — cierre (no se negocia)',
  },
};

/** A short icon per band. Icon-first labelling reduces language dependency
 *  (PACKHOUSE_HANDOFF_RESEARCH_2026.md §5.4). Decorative — always aria-hidden. */
export const CREW_DAY_GROUP_ICONS: Record<CrewDayGroup, string> = {
  morning: '🌅',
  lunch: '🕛',
  afternoon: '🌤️',
  closedown: '🌙',
};

/**
 * MONDAY — verbatim from PACK_CREW_CHECKLISTS.md (Todd-approved 2026-08-15).
 * 13 tasks. Tuesday–Thursday are still drafts and are deliberately absent.
 */
export const MONDAY_TASKS: readonly CrewTask[] = [
  // ── 🌅 Morning — priority packs ────────────────────────────────────────────
  {
    key: 'mon.am.harvie',
    group: 'morning',
    en: 'Harvie order — FULLY packed',
    es: 'Pedido de Harvie — empacado COMPLETO',
  },
  {
    key: 'mon.am.market_wagon',
    group: 'morning',
    en: 'Market Wagon order — FULLY packed',
    es: 'Pedido de Market Wagon — empacado COMPLETO',
  },
  {
    key: 'mon.am.food_bank',
    group: 'morning',
    en: 'Tuesday food bank order (when there is one) — FULLY packed',
    es: 'Pedido del banco de alimentos del martes (cuando haya) — empacado COMPLETO',
  },

  // ── 🕛 Lunchtime checkpoint — the highest-value line on the page ───────────
  {
    key: 'mon.lunch.tell_ben',
    group: 'lunch',
    flaggable: true,
    en: 'Missing ANY item for a Monday-pack order? Tell Ben AT LUNCH so it gets harvested in time — not discovered at 4pm',
    es: '¿Falta ALGÚN producto para un pedido que se empaca el lunes? Avísele a Ben A LA HORA DEL ALMUERZO para que dé tiempo de cosecharlo — no lo descubra a las 4 de la tarde',
  },

  // ── 🌤️ Afternoon ───────────────────────────────────────────────────────────
  {
    key: 'mon.pm.wholesale',
    group: 'afternoon',
    en: 'Pack as much of the wholesale orders as possible',
    es: 'Empacar lo más que se pueda de los pedidos de mayoreo',
  },
  {
    key: 'mon.pm.market_pallet',
    group: 'afternoon',
    en: 'Market pallet built & ready for Lawrenceville Market',
    es: 'Tarima del mercado armada y lista para el mercado de Lawrenceville',
  },
  {
    key: 'mon.pm.lville_csa',
    group: 'afternoon',
    en: 'Lawrenceville Market CSA boxes packed',
    es: 'Cajas de CSA del mercado de Lawrenceville empacadas',
  },

  // ── 🌙 End of day — close-down ─────────────────────────────────────────────
  {
    key: 'mon.eod.cooler_map',
    group: 'closedown',
    en: 'Cooler map accurate — cooler contents match the map, period',
    es: 'Mapa del enfriador correcto — lo que hay en el enfriador tiene que coincidir con el mapa, sin excusas',
  },
  {
    key: 'mon.eod.ben_checkin',
    group: 'closedown',
    en: "Check in with Ben → tomorrow morning's harvest list is accurate before leaving",
    es: 'Hablar con Ben antes de irse → que la lista de cosecha de mañana temprano quede correcta',
  },
  {
    key: 'mon.eod.tables',
    group: 'closedown',
    en: 'Stainless tables wiped down',
    es: 'Mesas de acero inoxidable limpias',
  },
  {
    key: 'mon.eod.scales',
    group: 'closedown',
    en: 'Scales stored with their own power cords',
    es: 'Básculas guardadas con su propio cable de corriente',
  },
  {
    key: 'mon.eod.compost',
    group: 'closedown',
    en: 'Compost out',
    es: 'Sacar la composta',
  },
  {
    key: 'mon.eod.packhouse',
    group: 'closedown',
    en: 'Packhouse = cleanest area on the farm: floors swept/squeegeed, trash out, dirty bins washed & stacked, drains clear, nothing left on work surfaces',
    es: 'La casa de empaque = el área más limpia de la granja: pisos barridos y secados con jalador, basura afuera, cajas sucias lavadas y apiladas, coladeras destapadas, nada encima de las mesas de trabajo',
  },
];

/** Language of the crew pages — mirrors lib/pick-pack.ts `Lang`. */
export type CrewLang = 'en' | 'es';

/** Task text in the active language. */
export function crewTaskText(task: CrewTask, lang: CrewLang): string {
  return lang === 'es' ? task.es : task.en;
}

/** Band heading in the active language. */
export function crewGroupLabel(group: CrewDayGroup, lang: CrewLang): string {
  return lang === 'es'
    ? CREW_DAY_GROUP_LABELS[group].es
    : CREW_DAY_GROUP_LABELS[group].en;
}

/** MONDAY_TASKS bucketed into the four bands, in workflow order. Empty bands
 *  are dropped so a future edit that empties one never renders a bare heading. */
export function mondayTasksByGroup(): { group: CrewDayGroup; tasks: CrewTask[] }[] {
  return CREW_DAY_GROUP_ORDER
    .map((group) => ({ group, tasks: MONDAY_TASKS.filter((t) => t.group === group) }))
    .filter((g) => g.tasks.length > 0);
}

/**
 * The flagged items on the lunch row, one per line, newest last. The note is an
 * append-only list ("Kale — 3\nChard — 2"); this splits it back apart for
 * rendering and for the header count. Blank lines are dropped so a stray
 * newline never inflates the count.
 */
export function parseFlaggedItems(note: string | null | undefined): string[] {
  if (!note) return [];
  return note
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Max characters the `note` column accepts (mirrors the zod cap in
 *  /api/admin/pick-pack/mark). The flag form refuses to append past this rather
 *  than silently truncating someone's missing item. */
export const CREW_NOTE_MAX = 500;

/**
 * Compose the note after flagging one more missing item. Returns null when the
 * append would exceed CREW_NOTE_MAX — the caller must then tell the crew the
 * list is full instead of dropping the item on the floor.
 */
export function appendFlaggedItem(
  note: string | null | undefined,
  item: string,
  qty: number | null,
): string | null {
  const clean = item.trim().replace(/[\r\n]+/g, ' ');
  if (clean.length === 0) return null;
  const line = qty != null && qty > 0 ? `${clean} — ${qty}` : clean;
  const existing = parseFlaggedItems(note);
  const next = [...existing, line].join('\n');
  return next.length > CREW_NOTE_MAX ? null : next;
}

/** UI strings for /admin/checklist, EN + ES. Same shape/spirit as
 *  PICK_PACK_STRINGS in lib/pick-pack.ts. `live` is JSON-serialised into the
 *  page and consumed by the browser controller. */
export const CREW_DAY_STRINGS: Record<CrewLang, {
  pageTitle: string;
  subtitle: string;
  langToggle: string;
  weekLine: string;        // "Writing to Monday {date}" — MUST contain {date}
  notMondayTitle: string;  // calm banner shown Tue–Sun
  notMondayBody: string;   // MUST contain {date}
  progressHeading: string;
  progressLabel: string;   // "{done} of {total} done" — MUST contain {done}+{total}
  allDone: string;
  live: {
    doneBy: string;          // "✓ {name} · {time}" connector word, e.g. "by"
    tick: string;            // aria-label prefix for the row checkbox
    saveFailed: string;
    retry: string;
    save: string;
    cancel: string;
    remove: string;
    flagBtn: string;         // "⚠️ Flag a missing item"
    flagHeading: string;     // amber panel heading
    flagItemLabel: string;   // "What's missing?"
    flagQtyLabel: string;    // "How many? (optional)"
    flagItemPlaceholder: string;
    flaggedCount: string;    // "{n} items flagged for Ben" — MUST contain {n}
    flaggedCountOne: string; // "1 item flagged for Ben"
    flagFull: string;        // note column is full
    flagEmpty: string;       // typed nothing
  };
}> = {
  en: {
    pageTitle: 'Monday checklist',
    subtitle: 'Pack crew — what has to happen today, and who did it',
    langToggle: 'Español',
    weekLine: 'Monday {date}',
    notMondayTitle: 'This is the MONDAY list',
    notMondayBody: 'Every tick and flag below is saved to Monday {date}. That is on purpose — finish Monday late, or look ahead — but Tuesday work does not belong here.',
    progressHeading: 'Progress',
    progressLabel: '{done} of {total} done',
    allDone: 'Monday is done. Nice work.',
    live: {
      doneBy: 'by',
      tick: 'Mark done',
      saveFailed: "Couldn't save — tap to retry",
      retry: 'Retry',
      save: 'Save',
      cancel: 'Cancel',
      remove: 'Remove',
      flagBtn: 'Flag a missing item',
      flagHeading: 'Flagged for Ben',
      flagItemLabel: "What's missing?",
      flagQtyLabel: 'How many? (optional)',
      flagItemPlaceholder: 'e.g. Kale',
      flaggedCount: '{n} items flagged for Ben',
      flaggedCountOne: '1 item flagged for Ben',
      flagFull: 'No room left in the list — tell Ben directly.',
      flagEmpty: 'Type what is missing first.',
    },
  },
  es: {
    pageTitle: 'Lista del lunes',
    subtitle: 'Equipo de empaque — lo que hay que hacer hoy, y quién lo hizo',
    langToggle: 'English',
    weekLine: 'Lunes {date}',
    notMondayTitle: 'Ésta es la lista del LUNES',
    notMondayBody: 'Todo lo que marque o reporte aquí se guarda en el lunes {date}. Así es a propósito — puede terminar el lunes más tarde, o revisarlo antes — pero el trabajo del martes no va aquí.',
    progressHeading: 'Progreso',
    progressLabel: '{done} de {total} hechas',
    allDone: 'El lunes quedó listo. Buen trabajo.',
    live: {
      doneBy: 'por',
      tick: 'Marcar como hecho',
      saveFailed: 'No se guardó — toque para reintentar',
      retry: 'Reintentar',
      save: 'Guardar',
      cancel: 'Cancelar',
      remove: 'Quitar',
      flagBtn: 'Reportar un producto que falta',
      flagHeading: 'Reportado para Ben',
      flagItemLabel: '¿Qué falta?',
      flagQtyLabel: '¿Cuántos? (opcional)',
      flagItemPlaceholder: 'ejemplo: Kale',
      flaggedCount: '{n} productos reportados para Ben',
      flaggedCountOne: '1 producto reportado para Ben',
      flagFull: 'Ya no cabe nada más en la lista — dígale a Ben directamente.',
      flagEmpty: 'Primero escriba qué es lo que falta.',
    },
  },
};
