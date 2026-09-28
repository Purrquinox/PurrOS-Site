"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, DescriptionList, ErrorBanner, Field, Input, PageHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { date, humanize } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { MeGuard } from "../me-shared";

type Contact = { name: string; relationship?: string; phone: string };
type Address = { line1?: string; line2?: string; city?: string; region?: string; postalCode?: string; country?: string };
type Profile = {
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  address: Address | null;
  emergencyContacts: Contact[] | null;
  position: string | null;
  employmentType: string;
  status: string;
  startDate: string | null;
  department: { name: string } | null;
  location: { name: string } | null;
  manager: { name: string } | null;
};

export default function MyProfile() {
  return (
    <MeGuard>
      <ProfilePage />
    </MeGuard>
  );
}

function ProfilePage() {
  const { hasFeature } = useSession();
  const { data, error, loading, reload } = useApi<Profile>("/me/profile");
  const canEdit = hasFeature("employee_area.profile_edit");

  if (error) return <ErrorBanner error={error} />;
  if (loading || !data) return <Spinner />;

  return (
    <>
      <PageHeader title="Profile" description={canEdit ? "Keep your contact details up to date. HR manages everything else." : "Ask HR to change any of these details."} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Employment">
          <DescriptionList
            items={[
              { label: "Name", value: `${data.firstName} ${data.lastName}` },
              { label: "Employee number", value: data.employeeNumber },
              { label: "Position", value: data.position },
              { label: "Employment type", value: humanize(data.employmentType) },
              { label: "Location", value: data.location?.name },
              { label: "Department", value: data.department?.name },
              { label: "Manager", value: data.manager?.name },
              { label: "Start date", value: date(data.startDate) },
              { label: "Work email", value: data.email },
            ]}
          />
        </Card>
        {canEdit ? (
          <ContactForm profile={data} onSaved={reload} />
        ) : (
          <Card title="Contact details">
            <DescriptionList
              items={[
                { label: "Preferred name", value: data.preferredName },
                { label: "Phone", value: data.phone },
                { label: "Address", value: [data.address?.line1, data.address?.city, data.address?.postalCode].filter(Boolean).join(", ") || "—" },
                { label: "Emergency contacts", value: data.emergencyContacts?.map((c) => `${c.name} (${c.phone})`).join("; ") || "—" },
              ]}
            />
          </Card>
        )}
      </div>
    </>
  );
}

function ContactForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [preferredName, setPreferredName] = useState(profile.preferredName ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [address, setAddress] = useState<Address>(profile.address ?? {});
  const [contacts, setContacts] = useState<Contact[]>(profile.emergencyContacts ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);

  useEffect(() => setSaved(false), [preferredName, phone, address, contacts]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api("/me/profile", {
        method: "PATCH",
        body: { preferredName, phone, address, emergencyContacts: contacts.filter((c) => c.name && c.phone) },
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const addr = (k: keyof Address, label: string) => (
    <Field label={label}>{(id) => <Input id={id} value={address[k] ?? ""} onChange={(e) => setAddress({ ...address, [k]: e.target.value })} />}</Field>
  );

  return (
    <Card title="Contact details">
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preferred name">{(id) => <Input id={id} value={preferredName} onChange={(e) => setPreferredName(e.target.value)} />}</Field>
          <Field label="Phone">{(id) => <Input id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}</Field>
        </div>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-medium">Address</legend>
          {addr("line1", "Address line 1")}
          {addr("line2", "Address line 2")}
          {addr("city", "City")}
          {addr("region", "State / region")}
          {addr("postalCode", "Postal code")}
          {addr("country", "Country code")}
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium">Emergency contacts</legend>
          {contacts.map((c, i) => (
            <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              {(["name", "relationship", "phone"] as const).map((k) => (
                <Field key={k} label={humanize(k)}>
                  {(id) => (
                    <Input
                      id={id}
                      value={c[k] ?? ""}
                      required={k !== "relationship"}
                      onChange={(e) => setContacts(contacts.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                    />
                  )}
                </Field>
              ))}
              <Button type="button" variant="ghost" aria-label="Remove contact" onClick={() => setContacts(contacts.filter((_, j) => j !== i))}>
                <Trash2 size={16} strokeWidth={1.75} />
              </Button>
            </div>
          ))}
          {contacts.length < 5 && (
            <div>
              <Button type="button" size="sm" onClick={() => setContacts([...contacts, { name: "", relationship: "", phone: "" }])}>
                <Plus size={14} aria-hidden /> Add contact
              </Button>
            </div>
          )}
        </fieldset>
        <ErrorBanner error={error} />
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-success">● Saved</span>}
          <Button type="submit" variant="primary" loading={busy}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}
