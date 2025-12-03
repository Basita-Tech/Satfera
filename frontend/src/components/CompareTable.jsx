import { X, Plus, Eye, Star } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from "framer-motion";
import { useState } from 'react';


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
  const slots = Array.from({ length: 5 }, (_, i) => profiles[i] || null);

  const getProfileId = (p) => p?.id ?? p?.userId ?? p?._id;

  const handleSendRequest = async (id) => {
    if (!id) return;
    console.log('🔵 CompareTable: Sending request for ID:', id);
    try {
      const result = await onSendRequest(id);
      console.log('🔵 CompareTable: onSendRequest result:', result);
    } catch (e) {
      console.warn('CompareTable: send request failed', e);
    }
  };

  const isSent = (id) => {
    const idStr = String(id);
    return Array.isArray(sentProfileIds) && sentProfileIds.some(sid => String(sid) === idStr);
  };

  if (profiles.length === 0) {
    return (
      <div className="bg-white rounded-[20px] p-12 satfera-shadow text-center">
        <p className="text-muted-foreground m-0 mb-4">
          No profiles selected for comparison. Add profiles to get started.
        </p>

        {onAddProfile && (
          <Button
            onClick={onAddProfile}
            className="bg-[#c8a227] hover:bg-[#c8a227]/90 text-white rounded-[12px] flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Add Profile
          </Button>
        )}
      </div>
    );
  }

  const rows = [
    { label: 'Age', key: 'age', suffix: 'years' },
    { label: 'Height', key: 'height' },
    { label: 'Weight', key: 'weight', suffix: 'kg' },
    { label: 'Location', key: 'city' },
    { label: 'Religion', key: 'religion' },
    { label: 'Caste', key: 'caste' },
    { label: 'Education', key: 'education' },
    { label: 'Profession', key: 'profession' },
    { label: 'Diet', key: 'diet' },
    { label: 'Smoking', key: 'smoking' },
    { label: 'Drinking', key: 'drinking' },
    { label: 'Family Type', key: 'familyType' },
    { label: 'Compatibility', key: 'compatibility', suffix: '%' }
  ];

  // Helper to safely resolve fields from varying API shapes
  const resolveField = (profile, key) => {
    if (!profile) return undefined;

    // Candidate roots with readable names for logging
    const rootCandidates = [
      { root: profile, name: 'profile' },
      { root: profile.user, name: 'profile.user' },
      { root: profile.personal, name: 'profile.personal' },
      { root: profile.health, name: 'profile.health' },
      { root: profile.profession, name: 'profile.profession' },
      { root: profile.family, name: 'profile.family' },
      { root: profile.basic, name: 'profile.basic' },
      { root: profile.details, name: 'profile.details' },
      { root: profile.moreInfo, name: 'profile.moreInfo' },
      { root: profile.profile, name: 'profile.profile' },
      { root: profile.data, name: 'profile.data' }
    ].filter((r) => r.root);

    // Recursive finder that returns both value and the path where it was found
    const findInObjectWithPath = (obj, keyToFind, pathSoFar = 'profile', visited = new Set(), depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 10) return undefined;
      if (visited.has(obj)) return undefined;
      visited.add(obj);

      if (Object.prototype.hasOwnProperty.call(obj, keyToFind)) {
        const v = obj[keyToFind];
        if (v !== undefined && v !== null) return { value: v, path: `${pathSoFar}.${keyToFind}` };
      }

      for (const k of Object.keys(obj)) {
        try {
          const child = obj[k];
          if (child && typeof child === 'object') {
            const found = findInObjectWithPath(child, keyToFind, `${pathSoFar}.${k}`, visited, depth + 1);
            if (found !== undefined && found !== null) return found;
          }
        } catch (e) {
          // ignore circular/other access errors
        }
      }
      return undefined;
    };

    // Deep search for any of a set of synonym keys (returns {value, path} or undefined)
    const findSynonymInObject = (obj, synonyms = [], pathSoFar = 'profile', visited = new Set(), depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 12) return undefined;
      if (visited.has(obj)) return undefined;
      visited.add(obj);

      for (const k of Object.keys(obj)) {
        try {
          const lower = String(k).toLowerCase();
          if (synonyms.includes(lower)) {
            const v = obj[k];
            if (v !== undefined && v !== null) return { value: v, path: `${pathSoFar}.${k}` };
          }
        } catch (e) {}
      }

      for (const k of Object.keys(obj)) {
        try {
          const child = obj[k];
          if (child && typeof child === 'object') {
            const found = findSynonymInObject(child, synonyms, `${pathSoFar}.${k}`, visited, depth + 1);
            if (found !== undefined && found !== null) return found;
          }
        } catch (e) {
          // ignore
        }
      }
      return undefined;
    };

    const tryPaths = (paths) => {
      for (const candidate of rootCandidates) {
        for (const p of paths) {
          const parts = p.split('.');
          let cur = candidate.root;
          let ok = true;
          for (const part of parts) {
            if (cur == null) { ok = false; break; }
            cur = cur[part];
          }
          if (ok && cur != null) {
            const foundPath = `${candidate.name}.${p}`;
            console.debug(`resolveField: key='${key}' found at '${foundPath}'` , cur);
            return cur;
          }
        }
      }
      return undefined;
    };

    const extractString = (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val === 'string') return val;
      if (typeof val === 'number') return String(val);
      if (Array.isArray(val)) return val.map(v => (typeof v === 'string' ? v : (v && (v.title || v.name) ? (v.title || v.name) : JSON.stringify(v)))).join(', ');
      if (typeof val === 'object') return val.title || val.name || val.profession || val.occupation || Object.values(val).find(x => typeof x === 'string') || JSON.stringify(val);
      return undefined;
    };

    switch (key) {
      case 'image':
        {
          const result = tryPaths(['image', 'closerPhoto.url', 'user.closerPhoto.url', 'user.image', 'user.profilePhoto.url'])
            ?? (findInObjectWithPath(profile, 'image') || {}).value;
          
          // Debug logging for image resolution
          if (!result || result === '') {
            console.warn('⚠️ Image not found for profile:', {
              profileId: profile?.id || profile?.userId,
              triedPaths: ['image', 'closerPhoto.url', 'user.closerPhoto.url', 'user.image', 'user.profilePhoto.url'],
              profileStructure: {
                hasImage: !!profile?.image,
                hasCloserPhoto: !!profile?.closerPhoto,
                hasUserCloserPhoto: !!profile?.user?.closerPhoto,
                imageValue: profile?.image,
                closerPhotoValue: profile?.closerPhoto,
                userCloserPhotoValue: profile?.user?.closerPhoto
              }
            });
          }
          
          return result;
        }
      case 'name':
        return tryPaths(['name', 'user.name', 'user.fullName', 'user.profileName', 'firstName', 'lastName'])
          ?? (findInObjectWithPath(profile, 'name') || {}).value;
      case 'age':
        return tryPaths(['age', 'user.age', 'personal.age']) ?? (findInObjectWithPath(profile, 'age') || {}).value;
        case 'profession':
          {
            const direct = profile.profession ?? profile.Profession ?? (profile.data && profile.data.profession) ?? profile.jobTitle ?? profile.currentJob ?? profile.job_title;
            if (direct !== undefined && direct !== null) return extractString(direct) ?? direct;

            const fromPaths = tryPaths([
              'profession', 'Profession', 'data.profession', 'occupation', 'Occupation', 'job', 'career', 'jobTitle', 'currentJob',
              'profession.Occupation', 'profession.occupation', 'user.profession', 'user.Occupation', 'user.occupation',
              'profile.profession', 'profile.profession.Occupation'
            ]);
            if (fromPaths !== undefined && fromPaths !== null) return extractString(fromPaths) ?? fromPaths;

            const deepFound = findInObjectWithPath(profile, 'profession') || findInObjectWithPath(profile, 'occupation') || findInObjectWithPath(profile, 'job') || findInObjectWithPath(profile, 'jobTitle') || undefined;
            if (deepFound && deepFound.value !== undefined && deepFound.value !== null) {
              try { console.debug(`resolveField: profession deepFound at '${deepFound.path}'`, deepFound.value); } catch(e) {}
              return extractString(deepFound.value) ?? deepFound.value;
            }

            // Final attempt: search for synonym keys anywhere (designation, title, role, position, etc.)
            const synonyms = ['profession','occupation','job','designation','title','role','position','career','jobtitle','professionname','profession_name'];
            const synFound = findSynonymInObject(profile, synonyms);
            if (synFound && synFound.value !== undefined && synFound.value !== null) {
              try { console.debug(`resolveField: profession synonymFound at '${synFound.path}'`, synFound.value); } catch(e) {}
              return extractString(synFound.value) ?? synFound.value;
            }

            return undefined;
          }
      case 'diet':
          return profile.diet ?? tryPaths([
           'diet', 'Diet', 'health.diet', 'health.Diet', 'user.health.diet', 'user.diet',
           'lifestyle.diet', 'habits.diet', 'profile.diet', 'attributes.diet'
          ]) ?? (findInObjectWithPath(profile, 'diet') || {}).value;
      case 'smoking':
          return (profile.smoking ?? profile.isTobaccoUser ?? profile.is_tobacco_user ?? profile.tobacco) ?? tryPaths([
           'smoking', 'isTobaccoUser', 'tobacco', 'habits.smoking', 'lifestyle.smoking',
           'health.isTobaccoUser', 'health.tobacco', 'user.isTobaccoUser', 'user.tobacco'
          ]) ?? (findInObjectWithPath(profile, 'smoking') || findInObjectWithPath(profile, 'isTobaccoUser') || findInObjectWithPath(profile, 'tobacco') || {}).value;
      case 'drinking':
          return (profile.drinking ?? profile.isAlcoholic ?? profile.is_alcoholic ?? profile.alcohol) ?? tryPaths([
           'drinking', 'isAlcoholic', 'alcohol', 'habits.drinking', 'lifestyle.drinking',
           'health.isAlcoholic', 'health.alcohol', 'user.isAlcoholic', 'user.alcohol'
          ]) ?? (findInObjectWithPath(profile, 'drinking') || findInObjectWithPath(profile, 'isAlcoholic') || findInObjectWithPath(profile, 'alcohol') || {}).value;
      case 'familyType':
          return profile.familyType ?? tryPaths([
           'familyType', 'family.familyType', 'user.familyType', 'family.type', 'family_type', 'family.family_type',
           'family.typeName', 'family.type_name', 'family.structure'
          ]) ?? (findInObjectWithPath(profile, 'familyType') || findInObjectWithPath(profile, 'family_type') || {}).value;
      case 'compatibility':
          return profile.compatibility ?? tryPaths(['compatibility', 'score', 'matchScore', 'match.score', 'compatibility.score']) ?? (findInObjectWithPath(profile, 'compatibility') || findInObjectWithPath(profile, 'score') || {}).value;
      case 'city':
        return tryPaths(['city', 'personal.city', 'user.personal.city', 'user.city']) ?? (findInObjectWithPath(profile, 'city') || {}).value;
      case 'religion':
        return tryPaths(['religion', 'personal.religion', 'user.personal.religion', 'user.religion']) ?? (findInObjectWithPath(profile, 'religion') || {}).value;
      case 'caste':
        return tryPaths(['caste', 'personal.subCaste', 'personal.subcaste', 'user.personal.subCaste', 'user.caste']) ?? (findInObjectWithPath(profile, 'caste') || {}).value;
      case 'education':
        return tryPaths(['education', 'user.education']) ?? (findInObjectWithPath(profile, 'education') || {}).value;
      default:
        // Try direct keys on profile or any of the root candidates
        for (const candidate of rootCandidates) {
          try {
            if (candidate.root && candidate.root[key] !== undefined && candidate.root[key] !== null) {
              console.debug(`resolveField: key='${key}' found at '${candidate.name}.${key}'`, candidate.root[key]);
              return candidate.root[key];
            }
          } catch (e) {
            // ignore
          }
        }

        // Try a few nested path patterns across roots
        const nestedTry = tryPaths([`user.${key}`, `personal.${key}`, key]);
        if (nestedTry !== undefined && nestedTry !== null) return nestedTry;

        // As a last resort, do a recursive deep search with path info
        const deepFound = findInObjectWithPath(profile, key);
        return deepFound ? deepFound.value : undefined;
    }
  };

  // Temporary debug: enable to log each slot's object and resolved values
  const DEBUG_RESOLVE = true;
  if (DEBUG_RESOLVE) {
    try {
      slots.forEach((p, idx) => {
        console.groupCollapsed(`CompareTable slot[${idx}] debug`);
        console.log('raw profile object:', p);
        const keysToCheck = ['profession', 'diet', 'smoking', 'drinking', 'familyType', 'compatibility', 'image', 'name'];
        const mapped = {};
        keysToCheck.forEach((k) => {
          try { mapped[k] = resolveField(p, k); } catch (e) { mapped[k] = `ERROR: ${String(e)}`; }
        });
        console.log('resolved fields:', mapped);
        console.groupEnd();
      });
    } catch (e) {
      console.warn('CompareTable debug logging failed', e);
    }
  }


  // Helper to format resolved values for display
  const formatResolved = (profile, row) => {
    const raw = resolveField(profile, row.key);
    if (raw === undefined || raw === null) return '-';
    if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
    // compatibility may be a number; return as-is (suffix handled in UI)
    return String(raw);
  };

  return (
    <div className="space-y-6">
      {/* Selected Profiles Bar */}
      <div className="bg-white rounded-[20px] p-6 satfera-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="m-0">
            Comparing {profiles.length} Profile{profiles.length > 1 ? 's' : ''}
          </h3>
          <p className="text-sm text-muted-foreground m-0">Max 5 profiles</p>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {slots.map((profile, index) => (
            <div key={profile?.id || profile?.userId || `empty-${index}`} className="flex-shrink-0 relative overflow-visible pt-3 px-3">
              {profile ? (
                <>
                  {/* Gold Star (Shortlist) Icon */}
                  <Star
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleShortlist(getProfileId(profile));
                    }}
                    className={`absolute top-2 left-2 w-6 h-6 cursor-pointer z-[999] transition-all ${
                      Array.isArray(shortlistedIds) && shortlistedIds.some((sid) => String(sid) === String(getProfileId(profile)))
                        ? 'text-[#c8a227] fill-[#c8a227]'
                        : 'text-[#c8a227] hover:text-[#a88a1e]'
                    }`}
                    fill={Array.isArray(shortlistedIds) && shortlistedIds.some((sid) => String(sid) === String(getProfileId(profile))) ? 'currentColor' : 'none'}
                  />

                  {/* Red X (Remove) Icon */}
                  <X
                    onClick={(e) => {
                      e.stopPropagation();
                      const pid = profile?.id || profile?.userId || profile?._id;
                      if (!pid) {
                        console.warn('onRemove called but profile id is missing', profile);
                        return;
                      }
                      onRemove(pid);
                    }}
                    className="absolute top-2 right-2 text-red-500 w-6 h-6 cursor-pointer z-[999] transition-all"
                  />

                  {/* Profile Preview */}
                  <div className="w-24">
                    {resolveField(profile, 'image') ? (
                      <div className="w-24 h-24 rounded-[12px] overflow-visible" style={{position: 'relative'}}>
                        <img
                          src={resolveField(profile, 'image')}
                          alt={resolveField(profile, 'name') || ''}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-[12px] bg-gray-100 flex items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}

                    <p className="text-sm mt-2 text-center truncate m-0">{resolveField(profile, 'name') ?? '-'}</p>

                    <div className="mt-2 space-y-1">
                      <button
                        onClick={() => onViewProfile(getProfileId(profile))}
                        style={{ backgroundColor: '#ffffff' }}
                        className="w-full px-2 py-1 text-xs border border-[#c8a227] text-[#c8a227] rounded-lg hover:bg-[#c8a227] hover:text-white transition-all flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                onAddProfile && profiles.length < 5 && (
                    <button
                      onClick={onAddProfile}
                      style={{ backgroundColor: '#ffffff' }}
                      className="w-24 h-24 border-2 border-dashed border-[#e9d7af] rounded-[12px] flex flex-col items-center justify-center gap-2 hover:border-[#c8a227] hover:bg-[#c8a227]/5 transition-all"
                    >
                    <Plus className="w-6 h-6 text-[#c8a227]" />
                    <span className="text-xs text-[#c8a227]">Add Profile</span>
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-[20px] overflow-hidden satfera-shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-white">
                <th className="text-left p-4 text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                  Attribute
                </th>

                {slots.map((profile, index) => (
                  <th key={profile?.id || `empty-header-${index}`} className="p-4 text-center min-w-[200px]">
                    {profile ? (
                      <div className="flex flex-col items-center gap-2">
                                {resolveField(profile, 'image') ? (
                                  <div className="w-16 h-16 rounded-full overflow-hidden">
                                    <img
                                      src={resolveField(profile, 'image')}
                                      alt={resolveField(profile, 'name') || ''}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-xs text-muted-foreground">No image</div>
                                )}
                                <div>
                                  <p className="m-0 font-semibold text-base">{resolveField(profile, 'name') ?? '-'}</p>
                                  <p className="text-sm text-muted-foreground m-0">{resolveField(profile, 'age') ?? '-'} years</p>
                                </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">-</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                 <tr key={row.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-4 text-sm text-muted-foreground font-medium">{row.label}</td>

                  {slots.map((profile, i) => (
                    <td key={profile?.id || `empty-${row.key}-${i}`} className="p-4 text-center">
                      {profile ? (
                        <span className="text-[#222]">
                          {
                            // Safely render education objects by selecting a meaningful field
                            row.key === 'education'
                              ? (
                                  // resolveField may return an object or a string
                                  (() => {
                                    const educ = resolveField(profile, 'education');
                                    if (!educ) return '-';
                                    if (typeof educ === 'string') return educ;
                                    return (educ.HighestEducation || educ.FieldOfStudy || educ.SchoolName || educ.University || JSON.stringify(educ));
                                  })()
                                )
                              : (formatResolved(profile, row) )
                          }
                          {row.suffix ? ` ${row.suffix}` : ''}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons Row */}
        <div className="border-t border-border-subtle bg-white">
          <div className="flex">
            <div className="p-4 text-sm text-muted-foreground font-medium min-w-[150px]">
              Actions
            </div>

            {slots.map((profile, index) => (
              <div key={profile?.id || `empty-action-${index}`} className="flex-1 p-4 flex flex-col gap-2 min-w-[200px]">
                {profile ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewProfile(getProfileId(profile))}
                      className="border-[#c8a227] text-[#c8a227] hover:bg-[#c8a227] hover:text-white rounded-[12px]"
                    >
                      View Profile
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        const profileId = getProfileId(profile);
                        if (isSent(profileId)) return;
                        console.log('🔵 Button clicked for profile ID:', profileId, 'Is sent?', isSent(profileId), 'sentProfileIds:', sentProfileIds);
                        handleSendRequest(profileId);
                      }}
                      className={isSent(getProfileId(profile))
                        ? "bg-[#c8a227] hover:bg-[#c8a227] text-white rounded-[12px] cursor-default pointer-events-none"
                        : "bg-[#c8a227] hover:bg-[#c8a227]/90 text-white rounded-[12px]"}
                    >
                      {isSent(getProfileId(profile)) ? 'Sent' : 'Send Request'}
                    </Button>
                  </>
                ) : (
                  <div className="text-muted-foreground text-sm text-center">-</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
