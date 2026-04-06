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
  CheckCircle2,
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
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createActorWithConfig } from "./config";

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
  paidAmount: string;
  giftCardAmount: string;
  schemeAmount: string;
  installmentAmount: string;
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

const DEFAULT_SCHEME_OPTIONS = ["3000", "5000", "10000", "15000"];

function calcPaidAmount(
  schemeAmount: string | number,
  giftCardAmount: string | number,
): string {
  const scheme = Number(schemeAmount) || 5000;
  const gift = Number(giftCardAmount) || 11000;
  if (scheme <= 0) return "0";
  // Find first multiple of scheme > gift where (multiple - gift) < 10000
  let multiple = Math.ceil(gift / scheme) * scheme;
  if (multiple <= gift) multiple += scheme;
  while (multiple - gift >= 10000) {
    // This shouldn't happen with normal values, but safety fallback
    break;
  }
  return String(multiple - gift);
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
  paidAmount: "",
  giftCardAmount: "",
  schemeAmount: "",
  installmentAmount: "",
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
  color: string;
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
            type === "date" || type === "number"
              ? e.target.value
              : e.target.value.toUpperCase(),
          )
        }
        placeholder={placeholder}
        readOnly={readOnly}
        style={
          type !== "date" && type !== "number"
            ? { textTransform: "uppercase" }
            : undefined
        }
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

type AppMode = "new" | "update";

export default function App() {
  // Mode switcher
  const [mode, setMode] = useState<AppMode>("new");

  // Cached script URL — loaded from localStorage on mount, refreshed after Settings save
  const cachedScriptUrl = useRef<string>("");

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
  const [form, setForm] = useState<CustomerRecord>(() => ({
    ...emptyRecord,
    schemeAmount: "5000",
    installmentAmount: String(5000 * 15),
    giftCardAmount: "11000",
    paidAmount: calcPaidAmount("5000", "11000"),
  }));

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scriptUrl, setScriptUrl] = useState("");
  const [urlWarning, setUrlWarning] = useState("");

  // Scheme options (4 editable values for dropdown)
  const [schemeOptions, setSchemeOptions] = useState<string[]>([
    ...DEFAULT_SCHEME_OPTIONS,
  ]);
  // Temp state for settings editing
  const [settingsSchemeOptions, setSettingsSchemeOptions] = useState<string[]>([
    ...DEFAULT_SCHEME_OPTIONS,
  ]);
  const [settingsGiftCardDefault, setSettingsGiftCardDefault] =
    useState("11000");

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

  // Load settings from localStorage on mount
  useEffect(() => {
    const url = localStorage.getItem("scriptUrl") || "";
    const optsJson = localStorage.getItem("schemeOptions") || "";
    const giftCard = localStorage.getItem("defaultGiftCardAmount") || "11000";
    cachedScriptUrl.current = url;
    let opts = DEFAULT_SCHEME_OPTIONS;
    try {
      const parsed = JSON.parse(optsJson);
      if (Array.isArray(parsed) && parsed.length === 4) opts = parsed;
    } catch {}
    const defaultGift = giftCard || "11000";
    const scheme = opts[1] ?? "5000";
    setSchemeOptions(opts);
    setForm({
      ...emptyRecord,
      schemeAmount: scheme,
      installmentAmount: String(Number(scheme) * 15),
      giftCardAmount: defaultGift,
      paidAmount: calcPaidAmount(scheme, defaultGift),
    });
  }, []);

  /** Get the cached script URL */
  const getScriptUrl = async (): Promise<string> => {
    return cachedScriptUrl.current;
  };

  // Fetch all accounts for a mobile number
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
      // Apps Script returns { success: true, record: { "Member ID": "...", ... } }
      const data = (parsed.record ?? parsed.data ?? {}) as Record<
        string,
        unknown
      >;
      setForm({
        memberId: (data["Member ID"] ?? "") as string,
        groupCode: (data["Group Code"] ?? "") as string,
        membershipNumber: (data["Membership No"] ?? "") as string,
        dateOfJoining: toDateInput((data["Joining Date"] ?? "") as string),
        reference: (data.Reference ?? "") as string,
        fullName: (data["Full Name"] ?? "") as string,
        fullAddress: (data.Address ?? "") as string,
        mobileNumber: (data["Mobile 1"] ?? "") as string,
        altMobileNumber: (data["Mobile 2"] ?? "") as string,
        dateOfBirth: toDateInput((data.DOB ?? "") as string),
        anniversaryDate: toDateInput((data.Anniversary ?? "") as string),
        paidAmount: String(data["Paid Amount"] ?? ""),
        giftCardAmount: String(data["Gift Card Amount"] ?? ""),
        schemeAmount: String(data["Scheme Amount"] ?? ""),
        installmentAmount: (() => {
          const raw = String(data["Installment Amount"] ?? "");
          if (raw && raw !== "0") return raw;
          const scheme = String(data["Scheme Amount"] ?? "");
          return scheme ? String(Number(scheme) * 15) : "";
        })(),
        spouseName: (data["Spouse Name"] ?? "") as string,
        spouseBirthDate: toDateInput((data["Spouse DOB"] ?? "") as string),
        children1Name: (data["Child 1 Name"] ?? "") as string,
        children1BirthDate: toDateInput((data["Child 1 DOB"] ?? "") as string),
        children2Name: (data["Child 2 Name"] ?? "") as string,
        children2BirthDate: toDateInput((data["Child 2 DOB"] ?? "") as string),
        children3Name: (data["Child 3 Name"] ?? "") as string,
        children3BirthDate: toDateInput((data["Child 3 DOB"] ?? "") as string),
        remark: (data.Remarks ?? "") as string,
      });
      toast.success("Customer data loaded successfully.");
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
    } finally {
      setIsSelectingAccount(false);
    }
  };

  // Save/Update customer
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
      // Map camelCase form fields to exact Google Sheet column headers
      const sheetPayload: Record<string, string | number> = {
        "Member ID": form.memberId.trim().toUpperCase(),
        "Group Code": form.groupCode.trim().toUpperCase(),
        "Membership No": form.membershipNumber.trim().toUpperCase(),
        "Joining Date": formatDateForSheet(form.dateOfJoining),
        Reference: form.reference.trim().toUpperCase(),
        "Full Name": form.fullName.trim().toUpperCase(),
        Address: form.fullAddress.trim().toUpperCase(),
        "Mobile 1": form.mobileNumber.trim(),
        "Mobile 2": form.altMobileNumber.trim(),
        DOB: formatDateForSheet(form.dateOfBirth),
        Anniversary: formatDateForSheet(form.anniversaryDate),
        "Paid Amount": Number.parseFloat(form.paidAmount) || 0,
        "Gift Card Amount": Number.parseFloat(form.giftCardAmount) || 0,
        "Scheme Amount": Number.parseFloat(form.schemeAmount) || 0,
        "Installment Amount": Number.parseFloat(form.installmentAmount) || 0,
        "Spouse Name": form.spouseName.trim().toUpperCase(),
        "Spouse DOB": formatDateForSheet(form.spouseBirthDate),
        "Child 1 Name": form.children1Name.trim().toUpperCase(),
        "Child 1 DOB": formatDateForSheet(form.children1BirthDate),
        "Child 2 Name": form.children2Name.trim().toUpperCase(),
        "Child 2 DOB": formatDateForSheet(form.children2BirthDate),
        "Child 3 Name": form.children3Name.trim().toUpperCase(),
        "Child 3 DOB": formatDateForSheet(form.children3BirthDate),
        Remarks: form.remark.trim().toUpperCase(),
      };
      const savePayload = { action: "save", ...sheetPayload };
      const url = resolvedUrl;
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(savePayload),
        headers: { "Content-Type": "text/plain" },
      });
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
    const scheme = schemeOptions[1] ?? "5000";
    const giftCard = form.giftCardAmount || "11000";
    setForm({
      ...emptyRecord,
      schemeAmount: scheme,
      installmentAmount: String(Number(scheme) * 15),
      giftCardAmount: giftCard,
      paidAmount: calcPaidAmount(scheme, giftCard),
    });
    setLookupMobile("");
    setLookupAccounts([]);
    setSelectedIndex(null);
  };

  // Clear form
  const handleClear = () => {
    const scheme = schemeOptions[1] ?? "5000";
    const giftCard = form.giftCardAmount || "11000";
    setForm({
      ...emptyRecord,
      schemeAmount: scheme,
      installmentAmount: String(Number(scheme) * 15),
      giftCardAmount: giftCard,
      paidAmount: calcPaidAmount(scheme, giftCard),
    });
    setLookupMobile("");
    setLookupAccounts([]);
    setSelectedIndex(null);
    toast("Form cleared.");
  };

  // Open settings — read from localStorage state already loaded
  const handleOpenSettings = () => {
    setSettingsOpen(true);
    setUrlWarning("");
    setScriptUrl(cachedScriptUrl.current);
    setSettingsSchemeOptions([...schemeOptions]);
    setSettingsGiftCardDefault(form.giftCardAmount || "11000");
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

  // Save settings — persists to localStorage
  const handleSaveSettings = () => {
    localStorage.setItem("scriptUrl", scriptUrl);
    localStorage.setItem(
      "schemeOptions",
      JSON.stringify(settingsSchemeOptions),
    );
    localStorage.setItem("defaultGiftCardAmount", settingsGiftCardDefault);
    cachedScriptUrl.current = scriptUrl;
    setSchemeOptions([...settingsSchemeOptions]);
    setSettingsOpen(false);
    toast.success(
      scriptUrl.trim()
        ? "Settings saved successfully."
        : "Settings saved (script URL cleared).",
    );
    // Update form defaults with new gift card
    setForm((prev) => {
      const newGift = settingsGiftCardDefault;
      return {
        ...prev,
        giftCardAmount: newGift,
        paidAmount: calcPaidAmount(prev.schemeAmount, newGift),
      };
    });
  };

  // Build the 10-box grid
  const accountBoxes = Array.from({ length: 10 }, (_, i) => {
    const acc = lookupAccounts[i];
    return acc ?? null;
  });

  // Scheme amount default: pick first option that matches "5000", else first option
  const defaultSchemeAmount = schemeOptions.includes("5000")
    ? "5000"
    : (schemeOptions[0] ?? "5000");

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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
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

        {/* ── Lookup block — only in Update mode ───────────────── */}
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
            data-ocid="lookup.card"
          >
            <div className="px-6 pt-5 pb-6">
              <p
                className="text-[11px] font-bold uppercase tracking-widest mb-4"
                style={{ color: "oklch(0.38 0.12 170)" }}
              >
                Look Up Customer
              </p>
              <div className="flex gap-3">
                <Input
                  type="tel"
                  value={lookupMobile}
                  onChange={(e) => setLookupMobile(e.target.value)}
                  placeholder="Enter mobile number…"
                  className="flex-1 h-11 text-[15px] rounded-xl bg-white border-border/80"
                  data-ocid="lookup.input"
                  onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                />
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
                    ? `${lookupAccounts.length} account${
                        lookupAccounts.length !== 1 ? "s" : ""
                      } found — click to load`
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
                          <span className="text-[10px] font-bold text-foreground leading-tight break-all px-0.5">
                            {acc.memberId || `#${boxNum}`}
                          </span>
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

        {/* ── Form card ────────────────────────────────────────── */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: "oklch(0.99 0.005 170)",
            borderColor: "oklch(0.88 0.04 170)",
            boxShadow:
              "0 1px 3px 0 rgba(0,0,0,0.06), 0 4px 20px 0 oklch(0.52 0.18 170 / 0.06)",
          }}
        >
          <div className="space-y-7 px-6 py-7">
            {/* ── Member ID hero ─────────────────────────────────── */}
            <div
              className="rounded-xl px-4 py-4 border"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.94 0.065 168) 0%, oklch(0.96 0.04 190) 100%)",
                borderColor: "oklch(0.78 0.1 168)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "oklch(0.38 0.12 170)" }}
                >
                  Member ID
                </span>
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
                  {/* Scheme Amount — dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="scheme-amount"
                      className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Scheme Amount
                    </Label>
                    <select
                      id="scheme-amount"
                      value={form.schemeAmount || defaultSchemeAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        const installment = String(Number(val) * 15);
                        setForm((prev) => {
                          const gc = prev.giftCardAmount || "11000";
                          return {
                            ...prev,
                            schemeAmount: val,
                            installmentAmount: installment,
                            giftCardAmount: gc,
                            paidAmount: calcPaidAmount(val, gc),
                          };
                        });
                      }}
                      className="h-10 text-[14px] rounded-lg border border-border/80 bg-white px-3 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                      data-ocid="form.scheme_amount.select"
                    >
                      {schemeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Installment Amount — auto calculated: Scheme Amount × 15 */}
                  <div className="flex flex-col gap-1.5">
                    <Label
                      htmlFor="installment-amount"
                      className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Installment Amount
                    </Label>
                    <input
                      id="installment-amount"
                      type="number"
                      readOnly
                      value={
                        form.installmentAmount ||
                        String(
                          Number(form.schemeAmount || defaultSchemeAmount) * 15,
                        )
                      }
                      className="h-10 text-[14px] rounded-lg border border-border/80 bg-gray-100 px-3 text-muted-foreground cursor-not-allowed"
                      data-ocid="form.installment_amount.input"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Auto-calculated: Scheme Amount × 15
                    </span>
                  </div>

                  {/* Gift Card Amount */}
                  <Field
                    label="Gift Card Amount"
                    id="gift-card-amount"
                    value={form.giftCardAmount}
                    onChange={(v) => {
                      setForm((prev) => ({
                        ...prev,
                        giftCardAmount: v,
                        paidAmount: calcPaidAmount(
                          prev.schemeAmount || "5000",
                          v,
                        ),
                      }));
                    }}
                    placeholder="e.g. 11000"
                    data-ocid="form.gift_card_amount.input"
                  />

                  {/* Paid Amount */}
                  <Field
                    label="Paid Amount"
                    id="paid-amount"
                    value={form.paidAmount}
                    onChange={(v) => setField("paidAmount", v)}
                    placeholder="e.g. 5000"
                    data-ocid="form.paid_amount.input"
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
              Configure your Google Apps Script URL and Scheme Amount options.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Script URL */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="script-url"
                className="text-[12px] font-medium text-muted-foreground"
              >
                Google Apps Script URL
              </Label>
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
            </div>

            {/* Scheme Amount Options */}
            <div className="flex flex-col gap-2">
              <Label className="text-[12px] font-medium text-muted-foreground">
                Scheme Amount Options
              </Label>
              <p className="text-[11px] text-muted-foreground/60 -mt-1">
                These 4 values appear in the Scheme Amount dropdown on the form.
              </p>
              <div
                className="grid grid-cols-1 gap-3"
                style={{ maxWidth: "200px" }}
              >
                {([0, 1, 2, 3] as const).map((i) => (
                  <div key={String(i)} className="flex flex-col gap-1">
                    <Label
                      htmlFor={`scheme-opt-${i}`}
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      Option {i + 1}
                    </Label>
                    <Input
                      id={`scheme-opt-${i}`}
                      type="number"
                      value={settingsSchemeOptions[i] ?? ""}
                      onChange={(e) => {
                        const updated = [...settingsSchemeOptions];
                        updated[i] = e.target.value;
                        setSettingsSchemeOptions(updated);
                      }}
                      placeholder={`e.g. ${DEFAULT_SCHEME_OPTIONS[i]}`}
                      className="h-10 text-[13px] rounded-lg"
                      data-ocid={`settings.scheme_opt_${i + 1}.input`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Default Amounts */}
            <div className="flex flex-col gap-2">
              <Label className="text-[12px] font-medium text-muted-foreground">
                Default Amounts (pre-filled on new entry)
              </Label>
              <p className="text-[11px] text-muted-foreground/60 -mt-1">
                This value is pre-filled in Gift Card Amount for each new
                customer. Paid Amount is auto-calculated from the scheme and
                gift card.
              </p>
              <div
                className="grid grid-cols-1 gap-3"
                style={{ maxWidth: "200px" }}
              >
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="default-gift-card"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Gift Card Amount
                  </Label>
                  <Input
                    id="default-gift-card"
                    type="number"
                    value={settingsGiftCardDefault}
                    onChange={(e) => setSettingsGiftCardDefault(e.target.value)}
                    placeholder="e.g. 11000"
                    className="h-10 text-[13px] rounded-lg"
                    data-ocid="settings.default_gift_card.input"
                  />
                </div>
              </div>
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
              onClick={handleSaveSettings}
              className="h-9 px-4 text-[13px] rounded-lg text-white"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.52 0.18 170) 0%, oklch(0.48 0.16 185) 100%)",
              }}
              data-ocid="settings.save_button"
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
