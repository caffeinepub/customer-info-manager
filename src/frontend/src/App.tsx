import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Building2,
  Calendar,
  ClipboardList,
  Loader2,
  MessageSquare,
  Phone,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  Settings,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { backendInterface as FullBackendInterface } from "./backend.d";
import { useActor } from "./hooks/useActor";

interface CustomerRecord {
  memberId: string;
  groupCode: string;
  membershipNumber: string;
  dateOfJoining: string;
  reference: string;
  fullName: string;
  fullAddress: string;
  mobileNumber: string;
  altMobileNumber: string;
  dateOfBirth: string;
  anniversaryDate: string;
  amount: string;
  giftCardAmount: string;
  spouseName: string;
  spouseBirthDate: string;
  children1Name: string;
  children1BirthDate: string;
  children2Name: string;
  children2BirthDate: string;
  children3Name: string;
  children3BirthDate: string;
  remark: string;
}

const emptyRecord: CustomerRecord = {
  memberId: "",
  groupCode: "",
  membershipNumber: "",
  dateOfJoining: "",
  reference: "",
  fullName: "",
  fullAddress: "",
  mobileNumber: "",
  altMobileNumber: "",
  dateOfBirth: "",
  anniversaryDate: "",
  amount: "",
  giftCardAmount: "",
  spouseName: "",
  spouseBirthDate: "",
  children1Name: "",
  children1BirthDate: "",
  children2Name: "",
  children2BirthDate: "",
  children3Name: "",
  children3BirthDate: "",
  remark: "",
};

// Section chip component with icon, label, color accent
interface SectionHeadingProps {
  children: React.ReactNode;
  icon: React.ReactNode;
  color: string; // tailwind bg class for border
  bgClass: string;
  borderClass: string;
  textClass: string;
}

function SectionHeading({
  children,
  icon,
  bgClass,
  borderClass,
  textClass,
}: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bgClass} border ${borderClass}`}
      >
        <span
          className={`${textClass} flex items-center`}
          style={{ width: 14, height: 14 }}
        >
          {icon}
        </span>
        <span
          className={`text-[11px] font-bold uppercase tracking-widest ${textClass}`}
        >
          {children}
        </span>
      </div>
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  "data-ocid"?: string;
}

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
  required,
  "data-ocid": ocid,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) =>
          onChange(
            type === "date" ? e.target.value : e.target.value.toUpperCase(),
          )
        }
        placeholder={placeholder}
        readOnly={readOnly}
        style={type !== "date" ? { textTransform: "uppercase" } : undefined}
        className={`h-10 text-[14px] rounded-lg border-border/80 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary ${
          readOnly
            ? "bg-muted/60 cursor-default text-muted-foreground"
            : "bg-white hover:border-primary/40"
        }`}
        data-ocid={ocid}
      />
    </div>
  );
}

// Person chip for family members
function PersonChip({ label, color }: { label: string; color: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${color} mb-3`}
    >
      <User style={{ width: 11, height: 11 }} />
      {label}
    </div>
  );
}

// Family member card wrapper
function FamilyCard({
  children,
  label,
  color,
}: { children: React.ReactNode; label: string; color: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/30 px-4 pt-3 pb-4">
      <PersonChip label={label} color={color} />
      {children}
    </div>
  );
}

/** Format date from yyyy-mm-dd to dd-mm-yyyy for Google Sheet export */
function formatDateForSheet(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

/** Convert any date string to YYYY-MM-DD for HTML date inputs */
function toDateInput(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}

/** Poll for actor availability, resolving once actor is non-null or timeout is reached. */
function waitForActor(
  getActor: () => FullBackendInterface | null,
  intervalMs = 500,
  timeoutMs = 3000,
): Promise<FullBackendInterface | null> {
  return new Promise((resolve) => {
    const existing = getActor();
    if (existing) {
      resolve(existing);
      return;
    }
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += intervalMs;
      const a = getActor();
      if (a) {
        clearInterval(timer);
        resolve(a);
      } else if (elapsed >= timeoutMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, intervalMs);
  });
}

type AppMode = "new" | "update";

export default function App() {
  const { actor: rawActor } = useActor();
  const actor = rawActor as FullBackendInterface | null;

  // Mode switcher
  const [mode, setMode] = useState<AppMode>("new");

  // Cached script URL — loaded once on mount, refreshed after Settings save
  const cachedScriptUrl = useRef<string>("");
  const [scriptUrlLoaded, setScriptUrlLoaded] = useState(false);

  // Load script URL from canister on mount
  useEffect(() => {
    if (!actor || scriptUrlLoaded) return;
    actor
      .getScriptUrl()
      .then((url) => {
        cachedScriptUrl.current = url;
        setScriptUrlLoaded(true);
      })
      .catch(() => {
        setScriptUrlLoaded(true);
      });
  }, [actor, scriptUrlLoaded]);

  // Lookup state
  const [lookupMobile, setLookupMobile] = useState("");
  const [lookupAccounts, setLookupAccounts] = useState<
    Array<{ memberId: string; index: number }>
  >([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSelectingAccount, setIsSelectingAccount] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state — flat CustomerRecord
  const [form, setForm] = useState<CustomerRecord>({ ...emptyRecord });

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scriptUrl, setScriptUrl] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [urlWarning, setUrlWarning] = useState("");

  const setField = useCallback(
    <K extends keyof CustomerRecord>(key: K, value: CustomerRecord[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Member ID auto-derive — syncs membershipNumber and derives groupCode
  const handleMemberIdChange = useCallback((value: string) => {
    const upperValue = value.toUpperCase();
    setForm((prev) => {
      const newForm = {
        ...prev,
        memberId: upperValue,
        membershipNumber: upperValue,
      };
      if (upperValue.includes("/")) {
        const prefix = upperValue.split("/")[0];
        const num = Number.parseInt(prefix, 10);
        if (!Number.isNaN(num)) {
          newForm.groupCode = `FDC - ${num}`;
        }
      }
      return newForm;
    });
  }, []);

  /** Get the cached script URL, or fetch from canister if not yet loaded */
  const getScriptUrl = async (): Promise<string> => {
    if (cachedScriptUrl.current) return cachedScriptUrl.current;
    if (!actor) return "";
    const url = await actor.getScriptUrl();
    cachedScriptUrl.current = url;
    return url;
  };

  // Fetch all accounts for a mobile number — shows account selection boxes
  const handleFetch = async () => {
    if (!lookupMobile.trim()) {
      toast.error("Please enter a mobile number to search.");
      return;
    }
    setIsFetching(true);
    setLookupAccounts([]);
    setSelectedIndex(null);
    try {
      const resolvedUrl = await getScriptUrl();
      if (!resolvedUrl.trim()) {
        toast.error(
          "Apps Script URL not configured. Please set it in Settings.",
        );
        return;
      }
      const url = `${resolvedUrl}?action=fetchAll&mobile=${encodeURIComponent(lookupMobile.trim())}`;
      const res = await fetch(url);
      const text = await res.text();
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text);
      } catch {
        toast.error(
          `Fetch error: Response is not valid JSON. First 200 chars: ${text.slice(0, 200)}`,
        );
        return;
      }
      if (parsed.error) {
        toast.error(`Fetch failed: ${parsed.error}`);
        return;
      }
      if (Array.isArray(parsed.memberIds)) {
        // New format: { success: true, memberIds: ["025/01", "026/02", ...] }
        const accounts = (parsed.memberIds as string[])
          .slice(0, 10)
          .map((mid, i) => ({ memberId: mid, index: i + 1 }));
        setLookupAccounts(accounts);
        if (accounts.length === 0) {
          toast.error("No accounts found for this mobile number.");
        } else {
          toast.success(
            `Found ${accounts.length} account(s). Click a card to load details.`,
          );
        }
      } else if (Array.isArray(parsed.accounts)) {
        // Old format: { accounts: [{ memberId, rank }] }
        const accounts = (
          parsed.accounts as Array<{ memberId: string; rank: number }>
        )
          .slice(0, 10)
          .map((acc, i) => ({ memberId: acc.memberId, index: i + 1 }));
        setLookupAccounts(accounts);
        if (accounts.length === 0) {
          toast.error("No accounts found for this mobile number.");
        } else {
          toast.success(
            `Found ${accounts.length} account(s). Click a card to load details.`,
          );
        }
      } else if (parsed.success && parsed.data) {
        // Fallback: old script that returns single record
        const data = parsed.data as Record<string, unknown>;
        const memberId = (data.memberId ?? "") as string;
        setLookupAccounts([{ memberId, index: 1 }]);
        toast.success("Found 1 account. Click to load details.");
      } else {
        toast.error("Unexpected response from server.");
      }
    } catch (err) {
      toast.error(
        `Fetch error: ${err instanceof Error ? err.message : String(err)}`,
      );
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  // Load full record when user clicks an account box
  const handleSelectAccount = async (memberId: string, index: number) => {
    setSelectedIndex(index);
    setIsSelectingAccount(true);
    try {
      const resolvedUrl = await getScriptUrl();
      if (!resolvedUrl.trim()) {
        toast.error("Apps Script URL not configured.");
        return;
      }
      const url = `${resolvedUrl}?action=fetchByMemberId&memberId=${encodeURIComponent(memberId)}`;
      const res = await fetch(url);
      const text = await res.text();
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text);
      } catch {
        toast.error(
          `Error: Response is not valid JSON. First 200 chars: ${text.slice(0, 200)}`,
        );
        return;
      }
      if (parsed.error) {
        toast.error(`Failed to load: ${parsed.error}`);
        return;
      }
      const data = parsed.data as Record<string, unknown>;
      setForm({
        memberId: (data.memberId ??
          data.member_id ??
          data.MemberId ??
          "") as string,
        groupCode: (data.groupCode ??
          data.group_code ??
          data.GroupCode ??
          "") as string,
        membershipNumber: (data.membershipNumber ??
          data.membership_number ??
          data.MembershipNumber ??
          "") as string,
        dateOfJoining: toDateInput(
          (data.dateOfJoining ??
            data.date_of_joining ??
            data.DateOfJoining ??
            "") as string,
        ),
        reference: (data.reference ?? data.Reference ?? "") as string,
        fullName: (data.fullName ??
          data.full_name ??
          data.FullName ??
          data.name ??
          "") as string,
        fullAddress: (data.fullAddress ??
          data.full_address ??
          data.FullAddress ??
          data.address ??
          "") as string,
        mobileNumber: (data.mobileNumber ??
          data.mobile_number ??
          data.MobileNumber ??
          data.mobile ??
          "") as string,
        altMobileNumber: (data.altMobileNumber ??
          data.alt_mobile_number ??
          data.AltMobileNumber ??
          data.alt_mobile ??
          "") as string,
        dateOfBirth: toDateInput(
          (data.dateOfBirth ??
            data.date_of_birth ??
            data.DateOfBirth ??
            data.dob ??
            "") as string,
        ),
        anniversaryDate: toDateInput(
          (data.anniversaryDate ??
            data.anniversary_date ??
            data.AnniversaryDate ??
            "") as string,
        ),
        amount: (data.amount ?? data.Amount ?? "") as string,
        giftCardAmount: (data.giftCardAmount ??
          data.gift_card_amount ??
          data.GiftCardAmount ??
          "") as string,
        spouseName: (data.spouseName ??
          data.spouse_name ??
          data.SpouseName ??
          "") as string,
        spouseBirthDate: toDateInput(
          (data.spouseBirthDate ??
            data.spouse_birth_date ??
            data.SpouseBirthDate ??
            "") as string,
        ),
        children1Name: (data.children1Name ??
          data.children1_name ??
          data.Children1Name ??
          "") as string,
        children1BirthDate: toDateInput(
          (data.children1BirthDate ??
            data.children1_birth_date ??
            data.Children1BirthDate ??
            "") as string,
        ),
        children2Name: (data.children2Name ??
          data.children2_name ??
          data.Children2Name ??
          "") as string,
        children2BirthDate: toDateInput(
          (data.children2BirthDate ??
            data.children2_birth_date ??
            data.Children2BirthDate ??
            "") as string,
        ),
        children3Name: (data.children3Name ??
          data.children3_name ??
          data.Children3Name ??
          "") as string,
        children3BirthDate: toDateInput(
          (data.children3BirthDate ??
            data.children3_birth_date ??
            data.Children3BirthDate ??
            "") as string,
        ),
        remark: (data.remark ?? data.Remark ?? "") as string,
      });
      toast.success("Customer data loaded successfully.");
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
    } finally {
      setIsSelectingAccount(false);
    }
  };

  // Save/Update customer — calls Google Apps Script directly from browser
  const handleSave = async () => {
    if (!form.memberId.trim()) {
      toast.error(
        "Member ID is required. Please fetch the customer first or enter a Member ID.",
      );
      return;
    }
    setIsSaving(true);
    try {
      const resolvedUrl = await getScriptUrl();
      if (!resolvedUrl.trim()) {
        toast.error(
          "Apps Script URL not configured. Please set it in Settings.",
        );
        return;
      }
      const formToSave = {
        ...form,
        dateOfJoining: formatDateForSheet(form.dateOfJoining),
        dateOfBirth: formatDateForSheet(form.dateOfBirth),
        anniversaryDate: formatDateForSheet(form.anniversaryDate),
        spouseBirthDate: formatDateForSheet(form.spouseBirthDate),
        children1BirthDate: formatDateForSheet(form.children1BirthDate),
        children2BirthDate: formatDateForSheet(form.children2BirthDate),
        children3BirthDate: formatDateForSheet(form.children3BirthDate),
      };
      const dataEncoded = encodeURIComponent(JSON.stringify(formToSave));
      const url = `${resolvedUrl}?action=save&data=${dataEncoded}`;
      const res = await fetch(url);
      const text = await res.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch {
        toast.error(
          `Failed to save: Response is not valid JSON. First 200 chars: ${text.slice(0, 200)}`,
        );
        return;
      }
      if (data.error) {
        console.error("Save response error:", data);
        toast.error(`Update failed: ${data.error}`);
        return;
      }
      toast.success("Customer information saved successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save: ${message}`);
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Mode switch — resets form and lookup state
  const handleModeSwitch = (newMode: AppMode) => {
    setMode(newMode);
    setForm({ ...emptyRecord });
    setLookupMobile("");
    setLookupAccounts([]);
    setSelectedIndex(null);
  };

  // Clear form
  const handleClear = () => {
    setForm({ ...emptyRecord });
    setLookupMobile("");
    setLookupAccounts([]);
    setSelectedIndex(null);
    toast("Form cleared.");
  };

  // Open settings — retry actor availability up to 3 seconds
  const handleOpenSettings = async () => {
    setSettingsOpen(true);
    setUrlWarning("");
    setIsLoadingUrl(true);
    try {
      const resolvedActor = await waitForActor(() => actor);
      if (!resolvedActor) return;
      const url = await resolvedActor.getScriptUrl();
      setScriptUrl(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // Handle URL input change — validate and set warning
  const handleScriptUrlChange = (value: string) => {
    setScriptUrl(value);
    if (
      value.trim() &&
      !value.trim().startsWith("https://script.google.com/")
    ) {
      setUrlWarning(
        "URL should start with https://script.google.com/ — double-check your Apps Script deployment URL.",
      );
    } else {
      setUrlWarning("");
    }
  };

  // Save settings URL — persists to canister and refreshes cached URL
  const handleSaveUrl = async () => {
    if (!actor) {
      toast.error("Backend not ready.");
      return;
    }
    setIsSavingUrl(true);
    try {
      await actor.setScriptUrl(scriptUrl);
      // Update the in-memory cache so next fetch/save uses the new URL immediately
      cachedScriptUrl.current = scriptUrl;
      setSettingsOpen(false);
      toast.success(
        scriptUrl.trim()
          ? "Script URL saved successfully."
          : "Script URL cleared.",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save script URL: ${message}`);
      console.error(err);
    } finally {
      setIsSavingUrl(false);
    }
  };

  // Build the 10-box grid: filled with account data or empty placeholders
  const accountBoxes = Array.from({ length: 10 }, (_, i) => {
    const acc = lookupAccounts[i];
    return acc ?? null;
  });

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />

      {/* ── Top header bar ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md border-b border-border"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.22 0.08 170) 0%, oklch(0.28 0.1 195) 100%)",
          boxShadow:
            "0 1px 0 0 oklch(0.85 0.05 170 / 0.3), 0 4px 20px 0 rgba(0,0,0,0.15)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo with glow */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.52 0.18 170) 0%, oklch(0.62 0.2 175) 100%)",
                boxShadow:
                  "0 0 0 1px oklch(0.7 0.15 170 / 0.4), 0 0 16px 0 oklch(0.52 0.18 170 / 0.5)",
              }}
            >
              <ClipboardList
                className="h-5 w-5 text-white"
                aria-hidden="true"
              />
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-white tracking-tight font-display leading-none">
                Customer Information
              </h1>
              <p className="text-[11px] text-white/60 tracking-wide mt-0.5">
                Manager
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            onClick={handleOpenSettings}
            data-ocid="settings.open_modal_button"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        {/* ── Mode Switcher ─────────────────────────────────────────── */}
        <div
          className="flex rounded-xl overflow-hidden border border-border mb-6 bg-muted/40 p-1 gap-1"
          data-ocid="mode.toggle"
        >
          <button
            type="button"
            onClick={() => handleModeSwitch("new")}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-[13px] font-semibold transition-all ${
              mode === "new"
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-ocid="mode.new.tab"
          >
            <PlusCircle className="h-4 w-4" />
            New Entry
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch("update")}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-[13px] font-semibold transition-all ${
              mode === "update"
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-ocid="mode.update.tab"
          >
            <Search className="h-4 w-4" />
            Update Existing
          </button>
        </div>

        {/* ── Lookup hero block — only shown in Update mode ────── */}
        {mode === "update" && (
          <div
            className="rounded-2xl border overflow-hidden mb-6"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.955 0.065 168) 0%, oklch(0.96 0.05 190) 100%)",
              borderColor: "oklch(0.82 0.1 168)",
              boxShadow:
                "0 2px 20px 0 oklch(0.52 0.18 170 / 0.12), 0 1px 4px 0 rgba(0,0,0,0.06)",
            }}
          >
            <div className="px-6 pt-5 pb-6">
              {/* Step label */}
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: "oklch(0.52 0.18 170)" }}
                >
                  1
                </div>
                <p
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "oklch(0.38 0.12 170)" }}
                >
                  Start here — Look up customer card
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 flex flex-col gap-1.5">
                  <Label
                    htmlFor="lookup-mobile"
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: "oklch(0.42 0.1 170)" }}
                  >
                    Mobile Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lookup-mobile"
                    type="tel"
                    value={lookupMobile}
                    onChange={(e) =>
                      setLookupMobile(e.target.value.toUpperCase())
                    }
                    placeholder="Enter mobile number to search"
                    style={{ textTransform: "uppercase" }}
                    className="h-11 text-[14px] rounded-xl bg-white border-white/80 shadow-xs focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary"
                    onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                    data-ocid="lookup.input"
                  />
                </div>
                <Button
                  onClick={handleFetch}
                  disabled={isFetching}
                  className="h-11 px-6 rounded-xl font-semibold text-[14px] shrink-0 text-white transition-all"
                  style={{
                    background: isFetching
                      ? "oklch(0.52 0.18 170 / 0.7)"
                      : "linear-gradient(135deg, oklch(0.52 0.18 170) 0%, oklch(0.48 0.16 185) 100%)",
                    boxShadow: isFetching
                      ? "none"
                      : "0 2px 12px 0 oklch(0.52 0.18 170 / 0.4)",
                  }}
                  data-ocid="lookup.button"
                >
                  {isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  {isFetching ? "Fetching..." : "Fetch"}
                </Button>
              </div>

              {/* 10-box account grid */}
              <div className="mt-5">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide mb-3"
                  style={{ color: "oklch(0.42 0.1 170)" }}
                >
                  {lookupAccounts.length > 0
                    ? `${lookupAccounts.length} account${lookupAccounts.length !== 1 ? "s" : ""} found — click to load`
                    : "Account cards — enter a mobile number and click Fetch"}
                </p>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {accountBoxes.map((acc, idx) => {
                    const boxNum = idx + 1;
                    const isSelected =
                      acc !== null && selectedIndex === acc.index;
                    const isLoading = isSelectingAccount && isSelected;
                    return (
                      <button
                        key={boxNum}
                        type="button"
                        onClick={() =>
                          acc && handleSelectAccount(acc.memberId, acc.index)
                        }
                        disabled={acc === null || isSelectingAccount}
                        className={`relative flex flex-col items-center justify-center rounded-xl border-2 text-center transition-all ${
                          acc === null
                            ? "border-dashed border-border/40 bg-muted/20 cursor-not-allowed opacity-50"
                            : isSelected
                              ? "border-teal-500 bg-teal-50 shadow-md cursor-pointer"
                              : "border-border bg-white hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer"
                        }`}
                        style={{
                          minHeight: "60px",
                          padding: "6px 4px",
                          ...(isSelected
                            ? {
                                borderColor: "oklch(0.52 0.18 170)",
                                boxShadow:
                                  "0 0 0 3px oklch(0.52 0.18 170 / 0.15)",
                              }
                            : {}),
                        }}
                        data-ocid={`lookup.item.${boxNum}`}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin text-teal-600" />
                        ) : acc !== null ? (
                          <>
                            <span className="text-[10px] font-bold text-foreground leading-tight break-all px-0.5">
                              {acc.memberId || `#${boxNum}`}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/40 font-medium">
                            {boxNum}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Form card ──────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="px-6 py-7 space-y-7">
            {/* ── Member ID — Primary Key ─────────────────────────── */}
            <div
              className="rounded-xl border-2 px-4 py-4"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.97 0.04 85) 0%, oklch(0.975 0.03 170) 100%)",
                borderColor: "oklch(0.52 0.18 170 / 0.35)",
                boxShadow: "0 0 0 4px oklch(0.52 0.18 170 / 0.05)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white"
                  style={{ background: "oklch(0.52 0.18 170)" }}
                >
                  Primary Key
                </div>
                <span className="text-[11px] text-muted-foreground italic">
                  Auto-fills Group Code &amp; Membership Number
                </span>
              </div>
              <div className="flex flex-col gap-1.5 max-w-xs">
                <Label
                  htmlFor="member-id"
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: "oklch(0.38 0.12 170)" }}
                >
                  Member ID
                </Label>
                <Input
                  id="member-id"
                  type="text"
                  value={form.memberId}
                  onChange={(e) => handleMemberIdChange(e.target.value)}
                  placeholder="e.g. 025/01"
                  className="h-10 text-[15px] font-semibold rounded-lg bg-white"
                  style={{ borderColor: "oklch(0.52 0.18 170 / 0.4)" }}
                  data-ocid="form.member_id.input"
                />
              </div>
            </div>

            {/* ── Account Details ─────────────────────────────────── */}
            <section>
              <SectionHeading
                icon={<Building2 size={14} />}
                color="teal"
                bgClass="bg-teal-50"
                borderClass="border-teal-200"
                textClass="text-teal-700"
              >
                Account Details
              </SectionHeading>
              <div className="rounded-xl border border-teal-100/80 bg-teal-50/20 px-4 py-4">
                <FieldGroup>
                  <Field
                    label="Group Code"
                    id="group-code"
                    value={form.groupCode}
                    onChange={(v) => setField("groupCode", v)}
                    placeholder="e.g. FDC - 25"
                    data-ocid="form.group_code.input"
                  />
                  <Field
                    label="Membership Number"
                    id="membership-number"
                    value={form.membershipNumber}
                    onChange={(v) => setField("membershipNumber", v)}
                    placeholder="e.g. 025/01"
                    data-ocid="form.membership_number.input"
                  />
                  <Field
                    label="Date of Joining"
                    id="date-of-joining"
                    type="date"
                    value={form.dateOfJoining}
                    onChange={(v) => setField("dateOfJoining", v)}
                    data-ocid="form.date_of_joining.input"
                  />
                  <Field
                    label="Reference"
                    id="reference"
                    value={form.reference}
                    onChange={(v) => setField("reference", v)}
                    placeholder="Referred by"
                    data-ocid="form.reference.input"
                  />
                </FieldGroup>
              </div>
            </section>

            {/* ── Personal Information ───────────────────────────── */}
            <section>
              <SectionHeading
                icon={<User size={14} />}
                color="teal"
                bgClass="bg-teal-50"
                borderClass="border-teal-200"
                textClass="text-teal-700"
              >
                Personal Information
              </SectionHeading>
              <div className="rounded-xl border border-teal-100/80 bg-teal-50/20 px-4 py-4 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="full-name"
                    className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Full Name
                  </Label>
                  <Input
                    id="full-name"
                    type="text"
                    value={form.fullName}
                    onChange={(e) =>
                      setField("fullName", e.target.value.toUpperCase())
                    }
                    placeholder="Customer's full name"
                    style={{ textTransform: "uppercase" }}
                    className="h-10 text-[14px] rounded-lg bg-white border-border/80 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-colors"
                    data-ocid="form.full_name.input"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="full-address"
                    className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Full Address
                  </Label>
                  <Textarea
                    id="full-address"
                    value={form.fullAddress}
                    onChange={(e) =>
                      setField("fullAddress", e.target.value.toUpperCase())
                    }
                    placeholder="Street, City, State, Pincode"
                    rows={3}
                    style={{ textTransform: "uppercase" }}
                    className="text-[14px] rounded-lg bg-white border-border/80 resize-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-colors"
                    data-ocid="form.full_address.textarea"
                  />
                </div>
              </div>
            </section>

            {/* ── Contact ───────────────────────────────────────── */}
            <section>
              <SectionHeading
                icon={<Phone size={14} />}
                color="cyan"
                bgClass="bg-cyan-50"
                borderClass="border-cyan-200"
                textClass="text-cyan-700"
              >
                Contact
              </SectionHeading>
              <div className="rounded-xl border border-cyan-100/80 bg-cyan-50/20 px-4 py-4">
                <FieldGroup>
                  <Field
                    label="Mobile Number"
                    id="mobile-number"
                    type="tel"
                    value={form.mobileNumber}
                    onChange={(v) => setField("mobileNumber", v)}
                    placeholder="Primary mobile"
                    data-ocid="form.mobile_number.input"
                  />
                  <Field
                    label="Alt Mobile Number"
                    id="alt-mobile-number"
                    type="tel"
                    value={form.altMobileNumber}
                    onChange={(v) => setField("altMobileNumber", v)}
                    placeholder="Alternate mobile"
                    data-ocid="form.alt_mobile_number.input"
                  />
                </FieldGroup>
              </div>
            </section>

            {/* ── Key Dates ────────────────────────────────────── */}
            <section>
              <SectionHeading
                icon={<Calendar size={14} />}
                color="amber"
                bgClass="bg-amber-50"
                borderClass="border-amber-200"
                textClass="text-amber-700"
              >
                Key Dates
              </SectionHeading>
              <div className="rounded-xl border border-amber-100/80 bg-amber-50/20 px-4 py-4">
                <FieldGroup>
                  <Field
                    label="Date of Birth"
                    id="date-of-birth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(v) => setField("dateOfBirth", v)}
                    data-ocid="form.date_of_birth.input"
                  />
                  <Field
                    label="Anniversary Date"
                    id="anniversary-date"
                    type="date"
                    value={form.anniversaryDate}
                    onChange={(v) => setField("anniversaryDate", v)}
                    data-ocid="form.anniversary_date.input"
                  />
                </FieldGroup>
              </div>
            </section>

            {/* ── Financials ────────────────────────────────────── */}
            <section>
              <SectionHeading
                icon={<Wallet size={14} />}
                color="emerald"
                bgClass="bg-emerald-50"
                borderClass="border-emerald-200"
                textClass="text-emerald-700"
              >
                Financials
              </SectionHeading>
              <div className="rounded-xl border border-emerald-100/80 bg-emerald-50/20 px-4 py-4">
                <FieldGroup>
                  <Field
                    label="Amount"
                    id="amount"
                    value={form.amount}
                    onChange={(v) => setField("amount", v)}
                    placeholder="e.g. 5000"
                    data-ocid="form.amount.input"
                  />
                  <Field
                    label="Gift Card Amount"
                    id="gift-card-amount"
                    value={form.giftCardAmount}
                    onChange={(v) => setField("giftCardAmount", v)}
                    placeholder="e.g. 500"
                    data-ocid="form.gift_card_amount.input"
                  />
                </FieldGroup>
              </div>
            </section>

            {/* ── Family Details ────────────────────────────────── */}
            <section>
              <SectionHeading
                icon={<Users size={14} />}
                color="purple"
                bgClass="bg-purple-50"
                borderClass="border-purple-200"
                textClass="text-purple-700"
              >
                Family Details
              </SectionHeading>
              <div className="space-y-3">
                <FamilyCard
                  label="Spouse"
                  color="bg-pink-100 text-pink-700 border border-pink-200"
                >
                  <FieldGroup>
                    <Field
                      label="Spouse Name"
                      id="spouse-name"
                      value={form.spouseName}
                      onChange={(v) => setField("spouseName", v)}
                      placeholder="Spouse's full name"
                      data-ocid="form.spouse_name.input"
                    />
                    <Field
                      label="Spouse Birth Date"
                      id="spouse-birth-date"
                      type="date"
                      value={form.spouseBirthDate}
                      onChange={(v) => setField("spouseBirthDate", v)}
                      data-ocid="form.spouse_birth_date.input"
                    />
                  </FieldGroup>
                </FamilyCard>

                <FamilyCard
                  label="Child 1"
                  color="bg-indigo-100 text-indigo-700 border border-indigo-200"
                >
                  <FieldGroup>
                    <Field
                      label="Children 1 Name"
                      id="children1-name"
                      value={form.children1Name}
                      onChange={(v) => setField("children1Name", v)}
                      placeholder="Child 1 name"
                      data-ocid="form.children1_name.input"
                    />
                    <Field
                      label="Children 1 Birth Date"
                      id="children1-birth-date"
                      type="date"
                      value={form.children1BirthDate}
                      onChange={(v) => setField("children1BirthDate", v)}
                      data-ocid="form.children1_birth_date.input"
                    />
                  </FieldGroup>
                </FamilyCard>

                <FamilyCard
                  label="Child 2"
                  color="bg-violet-100 text-violet-700 border border-violet-200"
                >
                  <FieldGroup>
                    <Field
                      label="Children 2 Name"
                      id="children2-name"
                      value={form.children2Name}
                      onChange={(v) => setField("children2Name", v)}
                      placeholder="Child 2 name"
                      data-ocid="form.children2_name.input"
                    />
                    <Field
                      label="Children 2 Birth Date"
                      id="children2-birth-date"
                      type="date"
                      value={form.children2BirthDate}
                      onChange={(v) => setField("children2BirthDate", v)}
                      data-ocid="form.children2_birth_date.input"
                    />
                  </FieldGroup>
                </FamilyCard>

                <FamilyCard
                  label="Child 3"
                  color="bg-sky-100 text-sky-700 border border-sky-200"
                >
                  <FieldGroup>
                    <Field
                      label="Children 3 Name"
                      id="children3-name"
                      value={form.children3Name}
                      onChange={(v) => setField("children3Name", v)}
                      placeholder="Child 3 name"
                      data-ocid="form.children3_name.input"
                    />
                    <Field
                      label="Children 3 Birth Date"
                      id="children3-birth-date"
                      type="date"
                      value={form.children3BirthDate}
                      onChange={(v) => setField("children3BirthDate", v)}
                      data-ocid="form.children3_birth_date.input"
                    />
                  </FieldGroup>
                </FamilyCard>
              </div>
            </section>

            {/* ── Remarks ──────────────────────────────────────── */}
            <section>
              <SectionHeading
                icon={<MessageSquare size={14} />}
                color="orange"
                bgClass="bg-orange-50"
                borderClass="border-orange-200"
                textClass="text-orange-700"
              >
                Remarks
              </SectionHeading>
              <div className="rounded-xl border border-orange-100/80 bg-orange-50/20 px-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="remark"
                    className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Remark
                  </Label>
                  <Textarea
                    id="remark"
                    value={form.remark}
                    onChange={(e) =>
                      setField("remark", e.target.value.toUpperCase())
                    }
                    placeholder="Any additional notes or remarks"
                    rows={3}
                    style={{ textTransform: "uppercase" }}
                    className="text-[14px] rounded-lg bg-white border-border/80 resize-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-colors"
                    data-ocid="form.remark.textarea"
                  />
                </div>
              </div>
            </section>

            {/* ── Action row ───────────────────────────────────── */}
            <div className="pt-2">
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-5" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-[12px] text-muted-foreground/70">
                  {mode === "new" ? (
                    form.memberId ? (
                      <span>
                        New entry —{" "}
                        <span
                          className="font-semibold"
                          style={{ color: "oklch(0.38 0.12 170)" }}
                        >
                          Member ID: {form.memberId}
                        </span>
                      </span>
                    ) : (
                      "Fill in the fields above to create a new customer record"
                    )
                  ) : form.memberId ? (
                    <span>
                      Editing{" "}
                      <span
                        className="font-semibold"
                        style={{ color: "oklch(0.38 0.12 170)" }}
                      >
                        Member #{form.memberId}
                      </span>
                    </span>
                  ) : (
                    "No member loaded — fetch to populate or enter manually"
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    className="h-10 px-5 rounded-xl text-[14px] font-medium border-border hover:bg-secondary/80 transition-colors"
                    data-ocid="form.cancel_button"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Clear
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-11 px-8 rounded-xl text-[14px] font-semibold text-white transition-all"
                    style={{
                      background: isSaving
                        ? "oklch(0.52 0.18 170 / 0.7)"
                        : "linear-gradient(135deg, oklch(0.52 0.18 170) 0%, oklch(0.48 0.16 185) 100%)",
                      boxShadow: isSaving
                        ? "none"
                        : "0 2px 16px 0 oklch(0.52 0.18 170 / 0.4)",
                    }}
                    data-ocid="form.submit_button"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSaving
                      ? "Saving..."
                      : mode === "new"
                        ? "Save New Entry"
                        : "Save / Update"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="mt-8 pb-6 text-center">
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-5" />
          <p className="text-[12px] text-muted-foreground/60">
            &copy; {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </main>

      {/* ── Settings Dialog ───────────────────────────────────── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md" data-ocid="settings.dialog">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold">
              Settings
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Configure the Google Apps Script Web App URL for data sync.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="script-url"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Google Apps Script URL
              </Label>
              {isLoadingUrl ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border bg-muted/40">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-[13px] text-muted-foreground">
                    Loading...
                  </span>
                </div>
              ) : (
                <>
                  <Input
                    id="script-url"
                    type="url"
                    value={scriptUrl}
                    onChange={(e) => handleScriptUrlChange(e.target.value)}
                    placeholder="https://script.google.com/macros/s/..."
                    className="h-10 text-[13px] rounded-lg"
                    data-ocid="settings.script_url.input"
                  />
                  {urlWarning && (
                    <div
                      className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2"
                      data-ocid="settings.error_state"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-[12px] text-amber-700 leading-snug">
                        {urlWarning}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSettingsOpen(false)}
              className="h-9 px-4 text-[13px] rounded-lg"
              data-ocid="settings.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveUrl}
              disabled={isSavingUrl || isLoadingUrl}
              className="h-9 px-4 text-[13px] rounded-lg text-white"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.52 0.18 170) 0%, oklch(0.48 0.16 185) 100%)",
              }}
              data-ocid="settings.save_button"
            >
              {isSavingUrl && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
              )}
              {isSavingUrl ? "Saving..." : "Save URL"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
