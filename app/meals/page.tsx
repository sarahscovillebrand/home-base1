"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import type { User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────
type Meal = { id: string; name: string; side_dish: string | null; instructions: string | null; created_at: string };
type Ingredient = { id: string; meal_id: string; name: string; sort_order: number };
type MealPlan = { id: string; week_start: string; day_of_week: number; meal_id: string | null };
type GroceryCheck = { id: string; week_start: string; ingredient_name: string };
type ShoppingItem = { id: string; name: string; store: StoreKey | null; sort_order: number; checked: boolean; created_at: string };
type MealPlanStore = { week_start: string; item_key: string; store: Exclude<StoreKey, "all"> };

// ─── Stores ───────────────────────────────────────────────────────────────────
const STORES = [
  { key: "all",        label: "All" },
  { key: "costco",     label: "Costco" },
  { key: "walmart",    label: "Walmart" },
  { key: "target",     label: "Target" },
  { key: "sprouts",    label: "Sprouts" },
  { key: "traderjoes", label: "Trader Joe's" },
] as const;
type StoreKey = typeof STORES[number]["key"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(today);
  mon.setDate(diff);
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
}

function formatWeekLabel(weekStart: string): string {
  const mon = new Date(weekStart + "T00:00:00");
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${mon.toLocaleDateString("en-US", opts)} – ${sun.toLocaleDateString("en-US", opts)}`;
}

const PLAN_DAYS = [
  { dow: 1, label: "Monday",    short: "Mon" },
  { dow: 2, label: "Tuesday",   short: "Tue" },
  { dow: 3, label: "Wednesday", short: "Wed" },
  { dow: 4, label: "Thursday",  short: "Thu" },
  { dow: 5, label: "Friday",    short: "Fri" },
];

// ─── CSV Parser (RFC 4180, handles BOM, CRLF, multi-line quoted fields) ───────
type ParsedMealRow = { name: string; side_dish: string; instructions: string; ingredients: string[] };

function parseMenuCSV(raw: string): ParsedMealRow[] {
  // Strip UTF-8 BOM if present
  const text = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;

  const rows: string[][] = [];
  let pos = 0;

  const parseField = (): string => {
    if (pos >= text.length) return "";
    if (text[pos] === '"') {
      // Quoted field
      pos++; // skip opening quote
      let val = "";
      while (pos < text.length) {
        const c = text[pos];
        if (c === '"') {
          if (text[pos + 1] === '"') { val += '"'; pos += 2; } // escaped quote
          else { pos++; break; } // closing quote
        } else {
          // Preserve \n inside quoted fields; skip bare \r
          if (c !== '\r') val += c;
          pos++;
        }
      }
      return val;
    } else {
      // Unquoted field — read until comma, \r, or \n
      let val = "";
      while (pos < text.length && text[pos] !== ',' && text[pos] !== '\r' && text[pos] !== '\n') {
        val += text[pos++];
      }
      return val;
    }
  };

  while (pos < text.length) {
    // Skip blank lines
    if (text[pos] === '\r' || text[pos] === '\n') { pos++; continue; }

    const row: string[] = [];
    row.push(parseField());
    while (pos < text.length && text[pos] === ',') {
      pos++; // skip comma
      row.push(parseField());
    }
    // Skip row terminator
    if (pos < text.length && text[pos] === '\r') pos++;
    if (pos < text.length && text[pos] === '\n') pos++;

    rows.push(row);
  }

  // Find header row by looking for "Meal Name" in any column of any row
  const headerIdx = rows.findIndex(r => r.some(c => c.trim().toLowerCase().includes("meal name")));
  if (headerIdx === -1) return [];

  const headers = rows[headerIdx].map(h => h.trim().toLowerCase());
  const nameCol  = headers.findIndex(h => h.includes("meal name"));
  const sideCol  = headers.findIndex(h => h.includes("side"));
  const instrCol = headers.findIndex(h => h.includes("instruct"));
  const ingCol   = headers.findIndex(h => h.includes("ingredient"));

  const results: ParsedMealRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (nameCol >= 0 ? r[nameCol] ?? "" : "").trim();
    if (!name) continue;
    results.push({
      name,
      side_dish:    (sideCol  >= 0 ? r[sideCol]  ?? "" : "").trim(),
      instructions: (instrCol >= 0 ? r[instrCol] ?? "" : "").trim(),
      ingredients:  (ingCol   >= 0 ? r[ingCol]   ?? "" : "")
                      .split("\n").map(l => l.trim()).filter(Boolean),
    });
  }
  return results;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function PlusIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function XIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function ChevronIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────
function BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(28,32,16,0.5)", display: "flex", alignItems: "flex-end" }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 480, margin: "0 auto",
          background: "#FFFFFF", borderRadius: "28px 28px 0 0",
          padding: "20px 20px calc(32px + env(safe-area-inset-bottom))",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.12)", margin: "0 auto 20px" }} />
        {children}
      </div>
    </div>
  );
}

// ─── Add Meal Sheet ───────────────────────────────────────────────────────────
function AddMealSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [sideDish, setSideDish] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 80); }, []);

  async function handleSave() {
    const trimName = name.trim();
    if (!trimName) return;
    setSaving(true);
    const { data: meal, error } = await supabase.from("meals").insert({
      name: trimName,
      side_dish: sideDish.trim() || null,
      instructions: instructions.trim() || null,
    }).select().single();
    if (!error && meal) {
      const lines = ingredientsText.split("\n").map((l: string) => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        await supabase.from("meal_ingredients").insert(
          lines.map((l: string, i: number) => ({ meal_id: meal.id, name: l, sort_order: i }))
        );
      }
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  const labelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1C2010", opacity: 0.4, marginTop: 4 };
  const inputBase: React.CSSProperties = { background: "#F4F7F0", border: "none", borderRadius: 14, padding: "13px 15px", fontSize: 14, fontWeight: 600, color: "#1C2010", outline: "none", width: "100%", resize: "none" as const, lineHeight: 1.6 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ ...labelStyle, marginTop: 0 }}>Meal name</p>
      <input
        ref={nameRef} value={name} onChange={e => setName(e.target.value)}
        placeholder="e.g. Ground Beef Tacos"
        style={{ ...inputBase, fontSize: 15 }}
      />
      <p style={labelStyle}>Side dish (optional)</p>
      <input
        value={sideDish} onChange={e => setSideDish(e.target.value)}
        placeholder="e.g. Mexican rice, black beans"
        style={{ ...inputBase, fontSize: 14 }}
      />
      <p style={labelStyle}>Ingredients (one per line)</p>
      <textarea
        value={ingredientsText} onChange={e => setIngredientsText(e.target.value)}
        placeholder={"ground beef\ntaco shells\nshredded cheese\nsalsa\nlime"}
        rows={5}
        style={inputBase}
      />
      <p style={labelStyle}>Instructions (optional)</p>
      <textarea
        value={instructions} onChange={e => setInstructions(e.target.value)}
        placeholder={"Brown the beef with taco seasoning. Warm shells in oven at 350° for 5 min. Assemble and serve."}
        rows={4}
        style={inputBase}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button type="button" onClick={onClose} style={{ flex: 1, background: "#F0EFF8", color: "#8070C0", border: "none", borderRadius: 999, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={!name.trim() || saving} style={{ flex: 2, background: name.trim() ? "#5E8B47" : "#C8D8BE", color: "#FFFFFF", border: "none", borderRadius: 999, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: name.trim() ? "pointer" : "default", transition: "background 0.15s" }}>
          {saving ? "Saving…" : "Save Meal"}
        </button>
      </div>
    </div>
  );
}

// ─── Meal Detail Sheet ────────────────────────────────────────────────────────
function MealDetailSheet({ meal, ingredients, onClose }: { meal: Meal; ingredients: Ingredient[]; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"instructions" | "ingredients">("instructions");
  return (
    <div>
      <p style={{ fontSize: 22, fontWeight: 900, color: "#1C2010", marginBottom: 2 }}>{meal.name}</p>
      {meal.side_dish && (
        <p style={{ fontSize: 13, fontWeight: 600, color: "#8BA870", marginBottom: 14 }}>with {meal.side_dish}</p>
      )}
      {/* Pill tabs */}
      <div style={{ display: "flex", gap: 6, background: "#F4F7F0", borderRadius: 999, padding: 3, marginBottom: 16 }}>
        {(["instructions", "ingredients"] as const).map(tab => {
          const active = activeTab === tab;
          return (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 999, border: "none", cursor: "pointer",
                background: active ? "#5E8B47" : "transparent",
                color: active ? "#FFFFFF" : "#8BA870",
                fontSize: 13, fontWeight: 700, textTransform: "capitalize", transition: "all 0.15s" }}>
              {tab}
            </button>
          );
        })}
      </div>
      {/* Tab content */}
      {activeTab === "instructions" ? (
        meal.instructions
          ? <p style={{ fontSize: 14, fontWeight: 600, color: "#1C2010", lineHeight: 1.7 }}>{meal.instructions}</p>
          : <p style={{ fontSize: 14, fontWeight: 600, color: "#8BA870" }}>No instructions added yet.</p>
      ) : (
        ingredients.length > 0
          ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ingredients.map(ing => (
                <div key={ing.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5E8B47", flexShrink: 0 }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#5E8B47" }}>{ing.name}</p>
                </div>
              ))}
            </div>
          : <p style={{ fontSize: 14, fontWeight: 600, color: "#8BA870" }}>No ingredients added yet.</p>
      )}
      <button type="button" onClick={onClose} style={{ width: "100%", marginTop: 24, background: "#E4EDDA", color: "#5E8B47", border: "none", borderRadius: 999, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        Done
      </button>
    </div>
  );
}

// ─── Meal Picker Sheet ────────────────────────────────────────────────────────
function MealPickerSheet({ meals, day, onPick, onClose, onAddNew }: {
  meals: Meal[]; day: typeof PLAN_DAYS[0];
  onPick: (mealId: string) => void; onClose: () => void; onAddNew: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1C2010", opacity: 0.4, marginBottom: 12 }}>
        Pick a meal for {day.label}
      </p>
      {meals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
          <p style={{ fontWeight: 700, color: "#1C2010", marginBottom: 4 }}>No meals yet</p>
          <p style={{ fontSize: 13, color: "#8BA870", fontWeight: 600 }}>Add your first meal to get started</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
          {meals.map(meal => (
            <button key={meal.id} type="button" onClick={() => onPick(meal.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F4F7F0", borderRadius: 16, padding: "14px 16px", border: "none", cursor: "pointer" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2010" }}>{meal.name}</span>
              <ChevronIcon color="#8BA870" size={16} />
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={onAddNew} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, background: "#E4EDDA", borderRadius: 16, padding: "13px", border: "2px dashed rgba(94,139,71,0.3)", cursor: "pointer" }}>
        <PlusIcon color="#5E8B47" size={15} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#5E8B47" }}>Add new meal to menu</span>
      </button>
    </div>
  );
}

// ─── Plan Tab ─────────────────────────────────────────────────────────────────
function PlanTab({ weekStart, plans, meals, ingredients, onAssign, onRemove, onDataRefresh }: {
  weekStart: string; plans: MealPlan[]; meals: Meal[]; ingredients: Ingredient[];
  onAssign: (dow: number, mealId: string) => Promise<void>;
  onRemove: (dow: number) => Promise<void>;
  onDataRefresh: () => void;
}) {
  const [pickerDay, setPickerDay] = useState<typeof PLAN_DAYS[0] | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [detailMeal, setDetailMeal] = useState<Meal | null>(null);
  const planMap = new Map(plans.map(p => [p.day_of_week, p]));
  const mealMap = new Map(meals.map(m => [m.id, m]));

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {PLAN_DAYS.map(day => {
          const plan = planMap.get(day.dow);
          const meal = plan?.meal_id ? mealMap.get(plan.meal_id) : null;
          const mealIngredients = meal ? ingredients.filter(i => i.meal_id === meal.id) : [];
          return (
            <div key={day.dow} style={{ background: "#FFFFFF", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "15px 16px", gap: 12 }}>
                <div style={{ width: 38, flexShrink: 0, fontSize: 11, fontWeight: 800, color: "#5E8B47", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {day.short}
                </div>
                {meal ? (
                  <>
                    <button type="button" onClick={() => setDetailMeal(meal)} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#1C2010" }}>{meal.name}</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#8BA870", marginTop: 2 }}>
                        {meal.side_dish ? `with ${meal.side_dish}` : meal.instructions ? "Tap for instructions" : "Tap for details"}
                      </p>
                    </button>
                    <button type="button" onClick={() => onRemove(day.dow)} style={{ width: 28, height: 28, borderRadius: "50%", background: "#F4F7F0", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <XIcon size={12} color="#8BA870" />
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setPickerDay(day)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E4EDDA", border: "2px dashed rgba(94,139,71,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <PlusIcon size={12} color="#5E8B47" />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#8BA870" }}>Add dinner</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Fixed Sat/Sun */}
        {[{ label: "Sat", note: "Leftovers" }, { label: "Sun", note: "Takeout" }].map(d => (
          <div key={d.label} style={{ background: "rgba(255,255,255,0.5)", borderRadius: 20 }}>
            <div style={{ display: "flex", alignItems: "center", padding: "15px 16px", gap: 12 }}>
              <div style={{ width: 38, fontSize: 11, fontWeight: 800, color: "#B5C9A5", letterSpacing: "0.04em", textTransform: "uppercase" }}>{d.label}</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#B5C9A5" }}>{d.note}</span>
            </div>
          </div>
        ))}
      </div>

      {pickerDay && !showAddNew && (
        <BottomSheet onClose={() => setPickerDay(null)}>
          <MealPickerSheet
            meals={meals} day={pickerDay}
            onPick={async (mealId) => { await onAssign(pickerDay.dow, mealId); setPickerDay(null); }}
            onClose={() => setPickerDay(null)}
            onAddNew={() => setShowAddNew(true)}
          />
        </BottomSheet>
      )}
      {detailMeal && (
        <BottomSheet onClose={() => setDetailMeal(null)}>
          <MealDetailSheet
            meal={detailMeal}
            ingredients={ingredients.filter(i => i.meal_id === detailMeal.id).sort((a, b) => a.sort_order - b.sort_order)}
            onClose={() => setDetailMeal(null)}
          />
        </BottomSheet>
      )}
      {pickerDay && showAddNew && (
        <BottomSheet onClose={() => { setShowAddNew(false); setPickerDay(null); }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#1C2010", marginBottom: 16 }}>New meal</p>
          <AddMealSheet onClose={() => setShowAddNew(false)} onSaved={() => { onDataRefresh(); setShowAddNew(false); }} />
        </BottomSheet>
      )}
    </>
  );
}

// ─── Groceries Tab ────────────────────────────────────────────────────────────

// Keywords that identify spices/seasonings — amounts are irrelevant for these
const SPICE_KEYWORDS = [
  "powder", "salt", "pepper", "oregano", "basil", "thyme", "cumin", "paprika",
  "chili", "seasoning", "worcestershire", "italian seasoning", "parsley", "cilantro",
  "bay leaf", "cayenne", "red pepper flake", "onion powder", "garlic powder",
  "cinnamon", "nutmeg", "turmeric", "coriander", "dried", "pinch",
];

function isSpiceItem(name: string): boolean {
  const lower = name.toLowerCase();
  return SPICE_KEYWORDS.some(k => lower.includes(k));
}

// Strip leading quantity ("1 lb", "2½ cups", "¼ tsp", etc.) to get base item name
function baseItemName(raw: string): string {
  return raw
    .replace(/^[\d½¼¾⅓⅔\s\/\.\-]+\s*(lbs?|oz|ounces?|cups?|tbsps?|tablespoons?|tsps?|teaspoons?|cloves?|sticks?|packages?|pkg|cans?|jars?|bunches?|pounds?|grams?|g|kg|ml|l|liters?)\b\.?\s*/i, "")
    .replace(/^\d+\s*[-–]\s*\d+\s*(lbs?|oz|cups?|tbsps?|tsps?)\b\.?\s*/i, "") // "1-2 cups"
    .replace(/\s*\(.*?\)\s*/g, "")  // strip parenthetical notes
    .trim()
    .toLowerCase();
}

type ConsolidatedItem = {
  key: string;          // normalized base name
  displayName: string;  // what to show (original name for first occurrence, base name for spices)
  checkKey: string;     // key used in grocery_checks
  isSpice: boolean;
  mealNames: string[];  // which meals need this
};

function buildConsolidatedList(
  plans: MealPlan[],
  mealMap: Map<string, Meal>,
  ingredients: Ingredient[]
): ConsolidatedItem[] {
  const map = new Map<string, ConsolidatedItem>();
  const seenMealIds = new Set<string>();

  for (const day of PLAN_DAYS) {
    const plan = plans.find(p => p.day_of_week === day.dow);
    if (!plan?.meal_id || seenMealIds.has(plan.meal_id)) continue;
    seenMealIds.add(plan.meal_id);
    const meal = mealMap.get(plan.meal_id);
    if (!meal) continue;

    const items = ingredients.filter(i => i.meal_id === meal.id).sort((a, b) => a.sort_order - b.sort_order);
    for (const item of items) {
      const base = baseItemName(item.name);
      const spice = isSpiceItem(item.name);

      if (map.has(base)) {
        const entry = map.get(base)!;
        if (!entry.mealNames.includes(meal.name)) entry.mealNames.push(meal.name);
      } else {
        map.set(base, {
          key: base,
          // Spices: just show the clean base name. Everything else: show original with quantity
          displayName: spice ? base : item.name,
          checkKey: item.name,
          isSpice: spice,
          mealNames: [meal.name],
        });
      }
    }
  }

  const items = Array.from(map.values());
  // Sort: regular items first (alphabetical), spices at the bottom (alphabetical)
  items.sort((a, b) => {
    if (a.isSpice !== b.isSpice) return a.isSpice ? 1 : -1;
    return a.displayName.localeCompare(b.displayName);
  });
  return items;
}

function GroceriesTab({ plans, meals, ingredients, checks, onToggleCheck, shoppingItems, mealPlanStores, onAddShoppingItem, onCheckShoppingItem, onClearCompleted, onUpdateShoppingItemStore, onSetMealPlanItemStore }: {
  weekStart: string; plans: MealPlan[]; meals: Meal[]; ingredients: Ingredient[];
  checks: GroceryCheck[]; onToggleCheck: (name: string, checked: boolean) => Promise<void>;
  shoppingItems: ShoppingItem[];
  mealPlanStores: MealPlanStore[];
  onAddShoppingItem: (name: string, store: Exclude<StoreKey, "all"> | null) => Promise<void>;
  onCheckShoppingItem: (id: string, checked: boolean) => Promise<void>;
  onClearCompleted: () => Promise<void>;
  onUpdateShoppingItemStore: (id: string, store: Exclude<StoreKey, "all"> | null) => Promise<void>;
  onSetMealPlanItemStore: (itemKey: string, store: Exclude<StoreKey, "all"> | null) => Promise<void>;
}) {
  const [activeStore, setActiveStore] = useState<StoreKey>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStore, setNewStore] = useState<Exclude<StoreKey, "all"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [storePickerFor, setStorePickerFor] = useState<string | null>(null); // item id or meal plan item key
  const [clearing, setClearing] = useState(false);

  const mealMap = new Map(meals.map(m => [m.id, m]));
  const checkedNames = new Set(checks.map(c => c.ingredient_name));
  const mpsMap = new Map(mealPlanStores.map(s => [s.item_key, s.store]));

  // All meal plan items (unchecked = not yet grabbed)
  const allMealPlanItems = buildConsolidatedList(plans, mealMap, ingredients);
  const uncheckedMealPlanItems = allMealPlanItems.filter(i => !checkedNames.has(i.checkKey));
  const checkedMealPlanItems = allMealPlanItems.filter(i => checkedNames.has(i.checkKey));

  const storeLabel = (key: StoreKey | null) => key ? STORES.find(s => s.key === key)?.label ?? key : "Add to store";

  // Filter meal plan items by active store tab
  const mealPlanForStore = activeStore === "all"
    ? uncheckedMealPlanItems
    : uncheckedMealPlanItems.filter(i => mpsMap.get(i.key) === activeStore);

  // Filter shopping items by active store
  const shoppingForStore = activeStore === "all"
    ? shoppingItems
    : shoppingItems.filter(i => i.store === activeStore);

  const completedCount = shoppingItems.filter(i => i.checked).length;
  const checkedMealPlanCount = checkedMealPlanItems.length;

  async function handleSaveItem() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    await onAddShoppingItem(name, newStore);
    setNewName(""); setNewStore(null); setShowAdd(false); setSaving(false);
  }

  function StorePicker({ currentStore, onPick, onClose }: { currentStore: string | null; onPick: (s: Exclude<StoreKey,"all"> | null) => void; onClose: () => void }) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={onClose}>
        <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "#FFFFFF", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", overflow: "hidden", minWidth: 150 }}
          onClick={e => e.stopPropagation()}>
          {STORES.filter(s => s.key !== "all").map(s => (
            <button key={s.key} type="button"
              onClick={() => { onPick(s.key as Exclude<StoreKey,"all">); onClose(); }}
              style={{ display: "block", width: "100%", padding: "12px 16px", border: "none", background: "none", textAlign: "left", fontSize: 14, fontWeight: 700, color: currentStore === s.key ? "#5E8B47" : "#1C2010", cursor: "pointer" }}>
              {s.label} {currentStore === s.key ? "✓" : ""}
            </button>
          ))}
          {currentStore && (
            <button type="button"
              onClick={() => { onPick(null); onClose(); }}
              style={{ display: "block", width: "100%", padding: "12px 16px", border: "none", borderTop: "1px solid rgba(94,139,71,0.1)", background: "none", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#C04568", cursor: "pointer" }}>
              Remove store
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Store filter pills ── */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, marginBottom: 18, scrollbarWidth: "none" }}>
        {STORES.map(s => {
          const active = activeStore === s.key;
          return (
            <button key={s.key} type="button" onClick={() => { setActiveStore(s.key); setStorePickerFor(null); }}
              style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: active ? "#5E8B47" : "rgba(255,255,255,0.7)",
                color: active ? "#FFFFFF" : "#8BA870", transition: "all 0.15s" }}>
              {s.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Meal plan items ── */}
        {mealPlanForStore.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: "#8BA870", marginBottom: 8, paddingLeft: 4 }}>
              {activeStore === "all" ? "This week's meals" : `From this week · ${storeLabel(activeStore)}`}
            </p>
            <div style={{ background: "#FFFFFF", borderRadius: 16, overflow: "visible" }}>
              {mealPlanForStore.map((item, i) => {
                const assignedStore = mpsMap.get(item.key) ?? null;
                const isPickingStore = storePickerFor === `mp-${item.key}`;
                return (
                  <div key={item.key} style={{ position: "relative", borderTop: i > 0 ? "1px solid rgba(94,139,71,0.08)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px" }}>
                      {/* Check off */}
                      <button type="button" onClick={() => onToggleCheck(item.checkKey, true)}
                        style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, border: "2px solid rgba(94,139,71,0.35)", background: "transparent", cursor: "pointer" }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#1C2010" }}>{item.displayName}</span>
                        {item.mealNames.length > 1 && (
                          <p style={{ fontSize: 11, fontWeight: 600, color: "#8BA870", marginTop: 1 }}>{item.mealNames.join(" · ")}</p>
                        )}
                      </div>
                      {/* Store badge — tap to assign */}
                      <button type="button" onClick={() => setStorePickerFor(isPickingStore ? null : `mp-${item.key}`)}
                        style={{ flexShrink: 0, fontSize: 11, fontWeight: 700,
                          color: assignedStore ? "#5E8B47" : "#8BA870",
                          background: assignedStore ? "rgba(94,139,71,0.12)" : "rgba(139,168,112,0.1)",
                          border: "none", borderRadius: 999, padding: "4px 10px", cursor: "pointer" }}>
                        {assignedStore ? storeLabel(assignedStore) : "Assign store"}
                      </button>
                    </div>
                    {isPickingStore && (
                      <StorePicker
                        currentStore={assignedStore}
                        onPick={s => onSetMealPlanItemStore(item.key, s)}
                        onClose={() => setStorePickerFor(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Shopping list items ── */}
        {shoppingForStore.length > 0 && (
          <div>
            {(activeStore === "all" || mealPlanForStore.length > 0) && (
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: "#8BA870", marginBottom: 8, paddingLeft: 4 }}>
                {activeStore === "all" ? "Your list" : storeLabel(activeStore)}
              </p>
            )}
            <div style={{ background: "#FFFFFF", borderRadius: 16, overflow: "visible" }}>
              {shoppingForStore.map((item, i) => {
                const isPickingStore = storePickerFor === `si-${item.id}`;
                return (
                  <div key={item.id} style={{ position: "relative", borderTop: i > 0 ? "1px solid rgba(94,139,71,0.08)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px" }}>
                      {/* Check = strikethrough */}
                      <button type="button" onClick={() => onCheckShoppingItem(item.id, !item.checked)}
                        style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                          border: item.checked ? "none" : "2px solid rgba(94,139,71,0.35)",
                          background: item.checked ? "#5E8B47" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
                        {item.checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600,
                        color: item.checked ? "#8BA870" : "#1C2010",
                        textDecoration: item.checked ? "line-through" : "none",
                        textDecorationColor: "rgba(94,139,71,0.4)",
                        transition: "all 0.15s" }}>
                        {item.name}
                      </span>
                      {/* Store badge */}
                      {!item.checked && (
                        <button type="button" onClick={() => setStorePickerFor(isPickingStore ? null : `si-${item.id}`)}
                          style={{ flexShrink: 0, fontSize: 11, fontWeight: 700,
                            color: item.store ? "#5E8B47" : "#8BA870",
                            background: item.store ? "rgba(94,139,71,0.12)" : "rgba(139,168,112,0.1)",
                            border: "none", borderRadius: 999, padding: "4px 10px", cursor: "pointer" }}>
                          {item.store ? storeLabel(item.store) : "No store"}
                        </button>
                      )}
                    </div>
                    {isPickingStore && (
                      <StorePicker
                        currentStore={item.store}
                        onPick={s => onUpdateShoppingItemStore(item.id, s)}
                        onClose={() => setStorePickerFor(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Checked-off meal plan items (strikethrough, All tab only) ── */}
        {activeStore === "all" && checkedMealPlanItems.length > 0 && (
          <div style={{ background: "#FFFFFF", borderRadius: 16, overflow: "hidden" }}>
            {checkedMealPlanItems.map((item, i) => (
              <button key={item.key} type="button" onClick={() => onToggleCheck(item.checkKey, false)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "none", border: "none", cursor: "pointer", borderTop: i > 0 ? "1px solid rgba(94,139,71,0.08)" : "none", textAlign: "left" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: "#5E8B47", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#8BA870", textDecoration: "line-through", textDecorationColor: "rgba(94,139,71,0.4)" }}>
                  {item.displayName}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {mealPlanForStore.length === 0 && shoppingForStore.length === 0 && checkedMealPlanCount === 0 && (
          <div style={{ textAlign: "center", padding: "36px 16px" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🛒</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1C2010" }}>
              {activeStore === "all" ? "Nothing on your list yet" : `Nothing for ${storeLabel(activeStore)} yet`}
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#8BA870", marginTop: 4 }}>
              {activeStore === "all" ? "Plan your week or tap + to add items." : "Tap + to add items for this store."}
            </p>
          </div>
        )}

        {/* ── Add item ── */}
        <button type="button" onClick={() => { setNewStore(activeStore === "all" ? null : activeStore as Exclude<StoreKey,"all">); setShowAdd(true); }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(255,255,255,0.6)", borderRadius: 20, border: "2px dashed rgba(94,139,71,0.3)", padding: "16px", cursor: "pointer", width: "100%" }}>
          <PlusIcon color="#5E8B47" size={16} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#5E8B47" }}>Add item</span>
        </button>

        {/* ── Clear completed ── */}
        {(completedCount > 0 || checkedMealPlanCount > 0) && (
          <button type="button" disabled={clearing}
            onClick={async () => {
              setClearing(true);
              // Uncheck all meal plan items
              for (const item of checkedMealPlanItems) {
                await onToggleCheck(item.checkKey, false);
              }
              await onClearCompleted();
              setClearing(false);
            }}
            style={{ width: "100%", padding: "13px 0", background: "rgba(192,69,104,0.08)", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, color: "#C04568", cursor: clearing ? "default" : "pointer" }}>
            {clearing ? "Clearing…" : `Clear completed (${completedCount + checkedMealPlanCount})`}
          </button>
        )}
      </div>

      {/* ── Add item sheet ── */}
      {showAdd && (
        <BottomSheet onClose={() => { setShowAdd(false); setNewName(""); setNewStore(null); }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#1C2010", marginBottom: 16 }}>Add item</p>
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="What do you need?"
            autoFocus
            style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: "2px solid rgba(94,139,71,0.2)", fontSize: 15, fontWeight: 600, color: "#1C2010", background: "#F8FBF5", outline: "none", marginBottom: 14, boxSizing: "border-box" }}
            onKeyDown={e => { if (e.key === "Enter") handleSaveItem(); }}
          />
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8BA870", marginBottom: 8 }}>Store</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
            {STORES.filter(s => s.key !== "all").map(s => {
              const sel = newStore === s.key;
              return (
                <button key={s.key} type="button" onClick={() => setNewStore(sel ? null : s.key as Exclude<StoreKey,"all">)}
                  style={{ padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                    background: sel ? "#5E8B47" : "rgba(94,139,71,0.1)",
                    color: sel ? "#FFFFFF" : "#5E8B47" }}>
                  {s.label}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={handleSaveItem} disabled={!newName.trim() || saving}
            style={{ width: "100%", background: newName.trim() ? "#5E8B47" : "rgba(94,139,71,0.3)", color: "#FFFFFF", border: "none", borderRadius: 999, padding: "14px 0", fontSize: 15, fontWeight: 800, cursor: newName.trim() ? "pointer" : "default" }}>
            {saving ? "Adding…" : "Add to list"}
          </button>
        </BottomSheet>
      )}
    </>
  );
}

// ─── Menu Tab ─────────────────────────────────────────────────────────────────
function MenuTab({ meals, ingredients, onDataRefresh }: {
  meals: Meal[]; ingredients: Ingredient[]; onDataRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<Record<string, "instructions" | "ingredients">>({});
  const [importing, setImporting] = useState(false);
  const [importToast, setImportToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setImportToast(msg);
    setTimeout(() => setImportToast(null), 4000);
  }

  async function handleDelete(mealId: string, mealName: string) {
    if (!window.confirm(`Delete "${mealName}" from the family menu? This can't be undone.`)) return;
    await supabase.from("meals").delete().eq("id", mealId);
    onDataRefresh();
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseMenuCSV(text);
      if (rows.length === 0) {
        showToast("No meals found — check the CSV headers.");
        setImporting(false);
        return;
      }
      let count = 0;
      for (const row of rows) {
        try {
          // Check if meal with this name already exists
          const { data: existing } = await supabase
            .from("meals").select("id").eq("name", row.name).limit(1);
          let mealId: string;
          if (existing && existing.length > 0) {
            mealId = existing[0].id;
            await supabase.from("meals").update({
              side_dish: row.side_dish || null,
              instructions: row.instructions || null,
            }).eq("id", mealId);
            await supabase.from("meal_ingredients").delete().eq("meal_id", mealId);
          } else {
            const { data: newMeal, error } = await supabase.from("meals").insert({
              name: row.name,
              side_dish: row.side_dish || null,
              instructions: row.instructions || null,
            }).select("id").single();
            if (error || !newMeal) continue;
            mealId = newMeal.id;
          }
          if (row.ingredients.length > 0) {
            await supabase.from("meal_ingredients").insert(
              row.ingredients.map((name, i) => ({ meal_id: mealId, name, sort_order: i }))
            );
          }
          count++;
        } catch (_e) { /* skip individual failed row */ }
      }
      showToast(`✓ ${count} of ${rows.length} meal${rows.length !== 1 ? "s" : ""} imported`);
      onDataRefresh();
    } catch (_err) {
      showToast("Import failed — please try again.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {meals.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <p style={{ fontSize: 36, marginBottom: 10 }}>🍽️</p>
            <p style={{ fontWeight: 700, color: "#1C2010", fontSize: 16 }}>Your menu is empty</p>
            <p style={{ fontSize: 13, color: "#8BA870", marginTop: 6, fontWeight: 600 }}>Add your family&apos;s go-to meals below.</p>
          </div>
        )}

        {meals.map(meal => {
          const mealIngredients = ingredients.filter(i => i.meal_id === meal.id).sort((a, b) => a.sort_order - b.sort_order);
          const isExpanded = expanded === meal.id;
          return (
            <div key={meal.id} style={{ background: "#FFFFFF", borderRadius: 28 }}>
              <button type="button" onClick={() => {
                  if (isExpanded) {
                    setExpanded(null);
                  } else {
                    setExpanded(meal.id);
                    setExpandedTab(prev => ({ ...prev, [meal.id]: prev[meal.id] ?? "instructions" }));
                  }
                }}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 16px", background: "none", border: "none", cursor: "pointer" }}>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#1C2010" }}>{meal.name}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#8BA870", marginTop: 2 }}>
                    {meal.side_dish ? `with ${meal.side_dish}` : `${mealIngredients.length} ingredient${mealIngredients.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button type="button" onClick={e => { e.stopPropagation(); handleDelete(meal.id, meal.name); }}
                    style={{ width: 28, height: 28, borderRadius: "50%", background: "#FEE8E8", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <XIcon size={12} color="#C04568" />
                  </button>
                  <div style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", color: "#8BA870" }}>
                    <ChevronIcon size={16} />
                  </div>
                </div>
              </button>
              {isExpanded && (
                <div style={{ borderTop: "1px solid rgba(94,139,71,0.1)", padding: "12px 14px 16px" }}>
                  {/* Tab switcher */}
                  <div style={{ display: "flex", gap: 6, background: "#F4F7F0", borderRadius: 999, padding: 3, marginBottom: 14 }}>
                    {(["instructions", "ingredients"] as const).map(tab => {
                      const active = (expandedTab[meal.id] ?? "instructions") === tab;
                      return (
                        <button key={tab} type="button"
                          onClick={e => { e.stopPropagation(); setExpandedTab(prev => ({ ...prev, [meal.id]: tab })); }}
                          style={{ flex: 1, padding: "7px 0", borderRadius: 999, border: "none", cursor: "pointer",
                            background: active ? "#5E8B47" : "transparent",
                            color: active ? "#FFFFFF" : "#8BA870",
                            fontSize: 12, fontWeight: 700, textTransform: "capitalize", transition: "all 0.15s" }}>
                          {tab}
                        </button>
                      );
                    })}
                  </div>
                  {/* Tab content */}
                  {(expandedTab[meal.id] ?? "instructions") === "instructions" ? (
                    meal.instructions
                      ? <p style={{ fontSize: 13, fontWeight: 600, color: "#1C2010", lineHeight: 1.7 }}>{meal.instructions}</p>
                      : <p style={{ fontSize: 13, fontWeight: 600, color: "#8BA870" }}>No instructions added yet.</p>
                  ) : (
                    mealIngredients.length > 0
                      ? mealIngredients.map(ing => (
                          <p key={ing.id} style={{ fontSize: 13, fontWeight: 600, color: "#5E8B47", lineHeight: 1.9 }}>· {ing.name}</p>
                        ))
                      : <p style={{ fontSize: 13, fontWeight: 600, color: "#8BA870" }}>No ingredients added yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setShowAdd(true)}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(255,255,255,0.6)", borderRadius: 20, border: "2px dashed rgba(94,139,71,0.3)", padding: "16px", cursor: "pointer" }}>
            <PlusIcon color="#5E8B47" size={16} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#5E8B47" }}>Add meal</span>
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: importing ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.6)", borderRadius: 20, border: "2px dashed rgba(94,139,71,0.3)", padding: "16px", cursor: importing ? "default" : "pointer" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#5E8B47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#5E8B47" }}>{importing ? "Importing…" : "Import CSV"}</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCSVImport} />
        </div>
      </div>

      {showAdd && (
        <BottomSheet onClose={() => setShowAdd(false)}>
          <p style={{ fontSize: 20, fontWeight: 900, color: "#1C2010", marginBottom: 16 }}>New meal</p>
          <AddMealSheet onClose={() => setShowAdd(false)} onSaved={() => { onDataRefresh(); setShowAdd(false); }} />
        </BottomSheet>
      )}

      {/* Import toast */}
      {importToast && (
        <div style={{
          position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
          background: "#1C2010", color: "#FFFFFF", borderRadius: 999,
          padding: "12px 22px", fontSize: 14, fontWeight: 700,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)", zIndex: 200,
          whiteSpace: "nowrap",
        }}>
          {importToast}
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function MealsInner({ user }: { user: User }) {
  const weekStart = getWeekStart();
  const [activeTab, setActiveTab] = useState<"plan" | "groceries" | "menu">("plan");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [checks, setChecks] = useState<GroceryCheck[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [mealPlanStores, setMealPlanStores] = useState<MealPlanStore[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: m }, { data: ing }, { data: p }, { data: c }, { data: si }, { data: mps }] = await Promise.all([
      supabase.from("meals").select("*").order("name"),
      supabase.from("meal_ingredients").select("*"),
      supabase.from("meal_plans").select("*").eq("week_start", weekStart),
      supabase.from("grocery_checks").select("*").eq("week_start", weekStart),
      supabase.from("shopping_items").select("*").order("created_at"),
      supabase.from("meal_plan_stores").select("*").eq("week_start", weekStart),
    ]);
    setMeals((m as Meal[]) ?? []);
    setIngredients((ing as Ingredient[]) ?? []);
    setPlans((p as MealPlan[]) ?? []);
    setChecks((c as GroceryCheck[]) ?? []);
    setShoppingItems((si as ShoppingItem[]) ?? []);
    setMealPlanStores((mps as MealPlanStore[]) ?? []);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  async function handleAssign(dow: number, mealId: string) {
    await supabase.from("meal_plans").upsert(
      { week_start: weekStart, day_of_week: dow, meal_id: mealId },
      { onConflict: "week_start,day_of_week" }
    );
    await load();
  }

  async function handleRemove(dow: number) {
    await supabase.from("meal_plans").update({ meal_id: null })
      .eq("week_start", weekStart).eq("day_of_week", dow);
    await load();
  }

  async function handleToggleCheck(ingredientName: string, shouldCheck: boolean) {
    if (shouldCheck) {
      await supabase.from("grocery_checks").upsert(
        { week_start: weekStart, ingredient_name: ingredientName },
        { onConflict: "week_start,ingredient_name" }
      );
    } else {
      await supabase.from("grocery_checks").delete()
        .eq("week_start", weekStart).eq("ingredient_name", ingredientName);
    }
    await load();
  }

  async function handleAddShoppingItem(name: string, store: Exclude<StoreKey, "all"> | null) {
    await supabase.from("shopping_items").insert({ name, store });
    await load();
  }

  async function handleCheckShoppingItem(id: string, checked: boolean) {
    await supabase.from("shopping_items").update({ checked }).eq("id", id);
    await load();
  }

  async function handleClearCompleted() {
    await supabase.from("shopping_items").delete().eq("checked", true);
    await load();
  }

  async function handleUpdateShoppingItemStore(id: string, store: Exclude<StoreKey, "all"> | null) {
    await supabase.from("shopping_items").update({ store }).eq("id", id);
    await load();
  }

  async function handleSetMealPlanItemStore(itemKey: string, store: Exclude<StoreKey, "all"> | null) {
    if (store) {
      await supabase.from("meal_plan_stores").upsert(
        { week_start: weekStart, item_key: itemKey, store },
        { onConflict: "week_start,item_key" }
      );
    } else {
      await supabase.from("meal_plan_stores").delete()
        .eq("week_start", weekStart).eq("item_key", itemKey);
    }
    await load();
  }

  const plannedCount = plans.filter(p => p.meal_id).length;

  return (
    <div style={{ background: "#E4EDDA", minHeight: "100vh", paddingBottom: 120, maxWidth: 480, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{
        background: "#5E8B47", borderRadius: "0 0 40px 40px",
        paddingTop: "calc(env(safe-area-inset-top) + 12px)",
        paddingBottom: 24, paddingLeft: 22, paddingRight: 22,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#D4EDBE", opacity: 0.8, marginBottom: 5 }}>
              Week of {formatWeekLabel(weekStart)}
            </p>
            <h1 style={{ fontSize: 38, fontWeight: 900, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-0.02em" }}>Meals</h1>
          </div>
          <NotificationBell userEmail={user.email!} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.25)", borderRadius: 999, padding: "11px 15px" }}>
            <p style={{ fontSize: 15, fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>{plannedCount} / 5</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#D4EDBE", opacity: 0.85, marginTop: 2 }}>dinners planned</p>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.25)", borderRadius: 999, padding: "11px 15px" }}>
            <p style={{ fontSize: 15, fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>{meals.length}</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#D4EDBE", opacity: 0.85, marginTop: 2 }}>meals in menu</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 6, margin: "18px 16px 0", background: "rgba(255,255,255,0.55)", borderRadius: 999, padding: 4 }}>
        {(["plan", "groceries", "menu"] as const).map(tab => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            style={{ flex: 1, padding: "9px 0", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: activeTab === tab ? "#5E8B47" : "transparent", color: activeTab === tab ? "#FFFFFF" : "#8BA870", transition: "background 0.15s, color 0.15s", textTransform: "capitalize" }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "18px 16px 0" }}>
        {loading ? (
          <p style={{ textAlign: "center", padding: "40px 0", color: "#8BA870", fontSize: 14, fontWeight: 600 }}>Loading…</p>
        ) : activeTab === "plan" ? (
          <PlanTab weekStart={weekStart} plans={plans} meals={meals} ingredients={ingredients}
            onAssign={handleAssign} onRemove={handleRemove} onDataRefresh={load} />
        ) : activeTab === "groceries" ? (
          <GroceriesTab weekStart={weekStart} plans={plans} meals={meals} ingredients={ingredients}
            checks={checks} onToggleCheck={handleToggleCheck}
            shoppingItems={shoppingItems}
            mealPlanStores={mealPlanStores}
            onAddShoppingItem={handleAddShoppingItem}
            onCheckShoppingItem={handleCheckShoppingItem}
            onClearCompleted={handleClearCompleted}
            onUpdateShoppingItemStore={handleUpdateShoppingItemStore}
            onSetMealPlanItemStore={handleSetMealPlanItemStore} />
        ) : (
          <MenuTab meals={meals} ingredients={ingredients} onDataRefresh={load} />
        )}
      </div>
    </div>
  );
}

export default function MealsPage() {
  return (
    <>
      <AuthGuard>{(user) => <MealsInner user={user} />}</AuthGuard>
      <BottomNav />
    </>
  );
}
