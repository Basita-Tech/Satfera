import { X, Plus, Eye, Star } from "lucide-react";
import { Button } from "./ui/button";
export function CompareTable({
  profiles,
  onRemove,
  onViewProfile,
  onSendRequest,
  onAddProfile,
  shortlistedIds = [],
  onToggleShortlist,
  sentProfileIds = []
}) {
  const slots = Array.from({
    length: 5
  }, (_, i) => profiles[i] || null);
  const getProfileId = p => p?.id ?? p?.userId ?? p?._id;
  const handleSendRequest = async id => {
    if (!id) return;
    try {
      await onSendRequest(id);
    } catch (e) {
      console.warn("CompareTable: send request failed", e);
    }
  };
  const capitalize = val => {
    if (val === undefined || val === null) return val;
    const s = String(val);
    return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  };
  const isSent = id => {
    const idStr = String(id);
    return Array.isArray(sentProfileIds) && sentProfileIds.some(sid => String(sid) === idStr);
  };
  if (profiles.length === 0) {
    return <div className="bg-white rounded-[20px] p-12 satfera-shadow text-center">
        <p className="text-muted-foreground m-0 mb-4">
          No profiles selected for comparison. Add profiles to get started.
        </p>

        {onAddProfile && <Button onClick={onAddProfile} className="bg-[#c8a227] hover:bg-[#c8a227]/90 text-white rounded-[12px] flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" />
            Add Profile
          </Button>}
      </div>;
  }
  const rows = [{
    label: "Age",
    key: "age",
    suffix: "years"
  }, {
    label: "Height",
    key: "height"
  }, {
    label: "Weight",
    key: "weight",
    suffix: "kg"
  }, {
    label: "Location",
    key: "city"
  }, {
    label: "Religion",
    key: "religion"
  }, {
    label: "Caste",
    key: "caste"
  }, {
    label: "Education",
    key: "education"
  }, {
    label: "Profession",
    key: "profession"
  }, {
    label: "Diet",
    key: "diet"
  }, {
    label: "Smoking",
    key: "smoking"
  }, {
    label: "Drinking",
    key: "drinking"
  }, {
    label: "Family Type",
    key: "familyType"
  }, {
    label: "Compatibility",
    key: "compatibility",
    suffix: "%"
  }];
  const resolveField = (profile, key) => {
    if (!profile) return undefined;
    const mapping = {
      image: profile?.closerPhoto?.url || profile.image || null,
      name: profile.name || profile.fullName || undefined,
      age: profile.age,
      height: profile.height,
      weight: profile.weight,
      city: profile.city,
      religion: profile.religion,
      caste: profile.caste,
      education: profile.education,
      profession: profile.profession,
      diet: profile.diet,
      smoking: profile.smoking,
      drinking: profile.drinking,
      familyType: profile.familyType,
      compatibility: profile.compatibility,
      fieldOfStudy: profile.fieldOfStudy
    };
    return mapping[key];
  };
  const formatResolved = (profile, row) => {
    const raw = resolveField(profile, row.key);
    if (raw === undefined || raw === null) return "-";
    if (typeof raw === "boolean") return raw ? "Yes" : "No";
    if (typeof raw === "string") {
      return capitalize(raw);
    }
    return String(raw);
  };
  return <div className="space-y-6">
      {}
      <div className="bg-white rounded-[20px] p-6 satfera-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="m-0">
            Comparing {profiles.length} Profile{profiles.length > 1 ? "s" : ""}
          </h3>
          <p className="text-sm text-muted-foreground m-0">Max 5 profiles</p>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {slots.map((profile, index) => <div key={profile?.id || profile?.userId || `empty-${index}`} className="flex-shrink-0 relative overflow-visible pt-3 px-3">
              {profile ? <>
                  {}
                  <Star onClick={e => {
              e.stopPropagation();
              onToggleShortlist(getProfileId(profile));
            }} className={`absolute top-2 left-2 w-6 h-6 cursor-pointer z-10 transition-all ${Array.isArray(shortlistedIds) && shortlistedIds.some(sid => String(sid) === String(getProfileId(profile))) ? "text-[#c8a227] fill-[#c8a227]" : "text-[#c8a227] hover:text-[#a88a1e]"}`} fill={Array.isArray(shortlistedIds) && shortlistedIds.some(sid => String(sid) === String(getProfileId(profile))) ? "currentColor" : "none"} />

                  {}
                  <X onClick={e => {
              e.stopPropagation();
              const pid = profile?.id || profile?.userId || profile?._id;
              if (!pid) {
                console.warn("onRemove called but profile id is missing", profile);
                return;
              }
              onRemove(pid);
            }} className="absolute top-2 right-2 text-red-500 w-6 h-6 cursor-pointer z-10 transition-all" />

                  {}
                  <div className="w-24">
                    {resolveField(profile, "image") ? <div className="w-24 h-24 rounded-[12px] overflow-visible" style={{
                position: "relative"
              }}>
                        <img src={resolveField(profile, "image")} alt={capitalize(resolveField(profile, "name")) || ""} className="w-full h-full object-cover" />
                      </div> : <div className="w-24 h-24 rounded-[12px] bg-gray-100 flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>}

                    <p className="text-sm mt-2 text-center truncate m-0">
                      {capitalize(resolveField(profile, "name")) ?? "-"}
                    </p>

                    <div className="mt-2 space-y-1">
                      <button onClick={() => onViewProfile(getProfileId(profile))} style={{
                  backgroundColor: "#ffffff"
                }} className="w-full px-2 py-1 text-xs border border-[#c8a227] text-[#c8a227] rounded-lg transition-all flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </div>
                  </div>
                </> : onAddProfile && profiles.length < 5 && <button onClick={onAddProfile} style={{
            backgroundColor: "#ffffff"
          }} className="w-24 h-24 border-2 border-dashed border-[#e9d7af] rounded-[12px] flex flex-col items-center justify-center gap-2 hover:border-[#c8a227] hover:bg-[#c8a227]/5 transition-all">
                    <Plus className="w-6 h-6 text-[#c8a227]" />
                    <span className="text-xs text-[#c8a227]">Add Profile</span>
                  </button>}
            </div>)}
        </div>
      </div>

      {}
      <div className="bg-white rounded-[20px] overflow-hidden satfera-shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-white">
                <th className="text-left p-4 text-sm text-muted-foreground" style={{
                fontWeight: 600
              }}>
                  Attribute
                </th>

                {slots.map((profile, index) => <th key={profile?.id || `empty-header-${index}`} className="p-4 text-center min-w-[200px]">
                    {profile ? <div className="flex flex-col items-center gap-2">
                        {resolveField(profile, "image") ? <div className="w-16 h-16 rounded-full overflow-hidden">
                            <img src={resolveField(profile, "image")} alt={capitalize(resolveField(profile, "name")) || ""} className="w-full h-full object-cover" />
                          </div> : <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-xs text-muted-foreground">
                            No image
                          </div>}
                        <div>
                          <p className="m-0 font-semibold text-base">
                            {capitalize(resolveField(profile, "name")) ?? "-"}
                          </p>
                        </div>
                      </div> : <div className="text-muted-foreground text-sm">-</div>}
                  </th>)}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => <tr key={row.key} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-4 text-sm text-muted-foreground font-medium">
                    {row.label}
                  </td>

                  {slots.map((profile, i) => <td key={profile?.id || `empty-${row.key}-${i}`} className="p-4 text-center">
                      {profile ? <span className="text-[#222]">
                          {row.key === "education" ? (() => {
                    const educ = resolveField(profile, "education");
                    if (!educ) return "-";
                    if (typeof educ === "string") return educ;
                    return educ.HighestEducation || educ.FieldOfStudy || educ.SchoolName || educ.University || JSON.stringify(educ);
                  })() : formatResolved(profile, row)}
                          {row.suffix ? ` ${row.suffix}` : ""}
                        </span> : <span className="text-muted-foreground">-</span>}
                    </td>)}
                </tr>)}
            </tbody>
          </table>
          {}
          <div className="border-t border-border-subtle bg-white">
            <div className="flex">
              <div className="p-4 text-sm text-muted-foreground font-medium min-w-[150px]">
                Actions
              </div>

              {slots.map((profile, index) => <div key={profile?.id || `empty-action-${index}`} className="flex-1 p-4 flex flex-col gap-2 min-w-[200px]">
                  {profile ? <>
                      <Button variant="outline" size="sm" onClick={() => onViewProfile(getProfileId(profile))} className="border-[#c8a227] text-[#c8a227] hover:bg-[#c8a227] hover:text-white rounded-[12px]">
                        View Profile
                      </Button>

                      <Button size="sm" onClick={() => {
                  const profileId = getProfileId(profile);
                  if (isSent(profileId)) return;
                  handleSendRequest(profileId);
                }} disabled={isSent(getProfileId(profile))} className={isSent(getProfileId(profile)) ? "bg-[#c8a227] hover:bg-[#c8a227] text-white rounded-[12px] cursor-default pointer-events-none" : "bg-[#c8a227] hover:bg-[#c8a227]/90 text-white rounded-[12px]"}>
                        {isSent(getProfileId(profile)) ? "Sent" : "Send Request"}
                      </Button>
                    </> : <div className="text-muted-foreground text-sm text-center">
                      -
                    </div>}
                </div>)}
            </div>
          </div>
        </div>
      </div>
    </div>;
}