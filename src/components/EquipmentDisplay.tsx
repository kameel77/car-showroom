'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Zap, 
  Armchair, 
  Monitor, 
  Settings2,
  CircleDot
} from 'lucide-react';
import { mapEquipmentToGroups } from '@/lib/equipment';
import { translateEquipment } from '@/lib/equipmentTranslations';

interface EquipmentDisplayProps {
  equipment: string[] | Record<string, string[]> | null | undefined;
}

// Map group names to Lucide icons
const groupIconComponents: Record<string, React.ReactNode> = {
  "Bezpieczeństwo": <ShieldCheck className="h-5 w-5 text-blue-600" />,
  "Osiągi i tuning": <Zap className="h-5 w-5 text-blue-600" />,
  "Komfort i dodatki": <Armchair className="h-5 w-5 text-blue-600" />,
  "Audio i multimedia": <Monitor className="h-5 w-5 text-blue-600" />,
  "Systemy wspomagania kierowcy": <Settings2 className="h-5 w-5 text-blue-600" />,
  "Inne": <CircleDot className="h-5 w-5 text-blue-600" />
};

const groupTranslationKeys: Record<string, string> = {
  "Bezpieczeństwo": "safety",
  "Osiągi i tuning": "performance",
  "Komfort i dodatki": "comfort",
  "Audio i multimedia": "multimedia",
  "Systemy wspomagania kierowcy": "driverAssist",
  "Inne": "other"
};

export function EquipmentDisplay({ equipment }: EquipmentDisplayProps) {
  const t = useTranslations('equipment');
  const locale = useLocale();
  const groupedEquipment = mapEquipmentToGroups(equipment);
  const groups = Object.entries(groupedEquipment);
  
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>(() => {
    // By default, expand first 3 groups
    const initial: Record<string, boolean> = {};
    groups.slice(0, 3).forEach(([groupName]) => {
      initial[groupName] = true;
    });
    return initial;
  });

  if (groups.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        {t('noEquipment')}
      </div>
    );
  }

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const getGroupDisplayName = (groupName: string): string => {
    const translationKey = groupTranslationKeys[groupName];
    if (translationKey) {
      return t(translationKey);
    }
    return groupName;
  };

  return (
    <div className="space-y-3">
      {groups.map(([groupName, items]) => (
        <div 
          key={groupName}
          className="border border-gray-200 rounded-lg overflow-hidden bg-white"
        >
          <button
            onClick={() => toggleGroup(groupName)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              {groupIconComponents[groupName] || <CircleDot className="h-5 w-5 text-blue-600" />}
              <span className="font-semibold text-gray-900">{getGroupDisplayName(groupName)}</span>
              <span className="text-sm text-gray-500">
                ({items.length})
              </span>
            </div>
            {expandedGroups[groupName] ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>
          
          {expandedGroups[groupName] && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {items.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-2 text-sm"
                >
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{translateEquipment(item, locale)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function EquipmentBadge({ items }: { items: string[] }) {
  const locale = useLocale();
  
  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 5).map((item, index) => (
        <span 
          key={index}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
        >
          <Check className="h-3 w-3 mr-1" />
          {translateEquipment(item, locale)}
        </span>
      ))}
      {items.length > 5 && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          +{items.length - 5} {locale === 'pl' ? 'więcej' : locale === 'de' ? 'mehr' : 'more'}
        </span>
      )}
    </div>
  );
}
