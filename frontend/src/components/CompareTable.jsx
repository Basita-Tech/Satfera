import { X, Plus, Eye, Star } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from "framer-motion";


export function CompareTable({
  profiles,
  onRemove,
  onViewProfile,
  onSendRequest,
  onAddProfile,
  shortlistedIds = [],
  onToggleShortlist
}) {
  const slots = Array.from({ length: 5 }, (_, i) => profiles[i] || null);

  if (profiles.length === 0) {
    return (
      <div className="bg-white rounded-[20px] p-12 satfera-shadow text-center">
        <p className="text-muted-foreground m-0 mb-4">
          No profiles selected for comparison. Add profiles to get started.
        </p>

        {onAddProfile && (
          <Button
            onClick={onAddProfile}
            className="bg-gold hover:bg-gold/90 text-white rounded-[12px] flex items-center gap-2 mx-auto"
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
            <div key={profile?.id || `empty-${index}`} className="flex-shrink-0 relative">
              {profile ? (
                <>
                  {/* Shortlist Button */}
                  {onToggleShortlist && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onToggleShortlist(profile.id)}
                      className="absolute -top-2 -left-2 w-6 h-6 bg-gold rounded-full flex items-center justify-center satfera-shadow z-10"
                    >
                      <Star
                        className={`w-3 h-3 ${Array.isArray(shortlistedIds) && shortlistedIds.some((sid) => String(sid) === String(profile.id))
                            ? 'text-white fill-white'
                            : 'text-white'
                          }`}
                      />
                    </motion.button>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => onRemove(profile.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-accent rounded-full flex items-center justify-center text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Profile Preview */}
                  <div className="w-24">
                    <img
                      src={profile.image}
                      alt={profile.name}
                      className="w-24 h-24 rounded-[12px] object-cover"
                    />

                    <p className="text-sm mt-2 text-center truncate m-0">{profile.name}</p>

                    <div className="mt-2 space-y-1">
                      <button
                        onClick={() => onViewProfile(profile.id)}
                        style={{ backgroundColor: '#ffffff' }}
                        className="w-full px-2 py-1 text-xs border border-gold text-gold rounded-lg hover:bg-gold hover:text-white transition-all flex items-center justify-center gap-1"
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
                      className="w-24 h-24 border-2 border-dashed border-[#e9d7af] rounded-[12px] flex flex-col items-center justify-center gap-2 hover:border-gold hover:bg-gold/5 transition-all"
                    >
                    <Plus className="w-6 h-6 text-gold" />
                    <span className="text-xs text-gold">Add Profile</span>
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
                        <img
                          src={profile.image}
                          alt={profile.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div>
                          <p className="m-0 font-semibold text-base">{profile.name}</p>
                          <p className="text-sm text-muted-foreground m-0">{profile.age} years</p>
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
                          {profile[row.key]}
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
                      onClick={() => onViewProfile(profile.id)}
                      className="border-gold text-gold hover:bg-gold hover:text-white rounded-[12px]"
                    >
                      View Profile
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => onSendRequest(profile.id)}
                      className="bg-gold hover:bg-gold/90 text-white rounded-[12px]"
                    >
                      Send Request
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
