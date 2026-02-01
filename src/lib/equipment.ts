export const equipmentGroups = {
  "Bezpieczeństwo": [
    "ABS",
    "ESP",
    "System wspomagania hamowania",
    "Asystent hamowania awaryjnego w mieście",
    "Aktywny asystent hamowania awaryjnego",
    "System ostrzegający o możliwej kolizji",
    "Alarm ruchu poprzecznego z tyłu pojazdu",
    "System wykrywania zmęczenie kierowcy",
    "System powiadamiania o wypadku",
    "Poduszka powietrzna kierowcy",
    "Poduszka powietrzna pasażera",
    "Poduszka kolan pasażera",
    "Kurtyny powietrzne - przód",
    "Boczne poduszki powietrzne - przód",
    "Kurtyny powietrzne - tył",
    "Boczne poduszki powietrzne - tył",
    "Isofix (punkty mocowania fotelika dziecięcego)"
  ],
  "Osiągi i tuning": [
    "Filtr cząstek stałych",
    "Felgi aluminiowe od 21",
    "Opony runflat",
    "Elektroniczna regul. charakterystyki zawieszenia",
    "Zawieszenie sportowe",
    "Zawieszenie pneumatyczne"
  ],
  "Komfort i dodatki": [
    "Klimatyzacja automatyczna, dwustrefowa",
    "Tapicerka skórzana",
    "Klimatyzacja dla pasażerów z tyłu",
    "Elektrycznie ustawiany fotel kierowcy",
    "Elektrycznie ustawiany fotel pasażera",
    "Podgrzewany fotel kierowcy",
    "Podgrzewany fotel pasażera",
    "Regul. elektr. podparcia lędźwiowego - kierowca",
    "Regul. elektr. podparcia lędźwiowego - pasażer",
    "Fotele przednie wentylowane",
    "Siedzenie z pamięcią ustawienia",
    "Sportowe fotele - przód",
    "Ogrzewane siedzenia tylne",
    "Podłokietniki - przód",
    "Podłokietniki - tył",
    "Kierownica skórzana",
    "Kierownica sportowa",
    "Kierownica ze sterowaniem radia",
    "Kolumna kierownicy regulowana elektrycznie",
    "Kierownica wielofunkcyjna",
    "Kierownica ogrzewana",
    "Zmiana biegów w kierownicy",
    "Keyless entry",
    "Keyless Go",
    "Ogrzewanie postojowe",
    "Czujnik deszczu",
    "Elektryczne szyby przednie",
    "Elektryczne szyby tylne",
    "Przyciemniane tylne szyby",
    "Wycieraczki",
    "Dach otwierany elektrycznie"
  ],
  "Audio i multimedia": [
    "Apple CarPlay",
    "Android Auto",
    "Interfejs Bluetooth",
    "Radio",
    "Gniazdo USB",
    "Ładowanie bezprzewodowe urządzeń",
    "System nawigacji satelitarnej",
    "System nagłośnienia",
    "Wyświetlacz typu Head-Up",
    "Ekran dotykowy",
    "Dostęp do internetu"
  ],
  "Systemy wspomagania kierowcy": [
    "Tempomat",
    "Lampy przednie w technologii LED",
    "Kontrola odległości z przodu (przy parkowaniu)",
    "Kontrola odległości z tyłu (przy parkowaniu)",
    "Park Assistant - asystent parkowania",
    "Niezależny system parkowania",
    "Kamera panoramiczna 360",
    "Kamera parkowania tył",
    "Lusterka boczne ustawiane elektrycznie",
    "Lusterka boczne składane elektrycznie",
    "Kamera w lusterku bocznym",
    "Asystent (czujnik) martwego pola",
    "Lane assist - kontrola zmiany pasa ruchu",
    "Kontrola odległości od poprzedzającego pojazdu",
    "Ogranicznik prędkości",
    "Asystent hamowania - Brake Assist",
    "Asystent pokonywania zakrętów",
    "Kontrola trakcji",
    "Automatyczna kontrola zjazdu ze stoku",
    "Wspomaganie ruszania pod górę- Hill Holder",
    "Aktywne rozpoznawanie znaków ograniczenia prędkości",
    "System rozpoznawania znaków drogowych",
    "Asystent zapobiegania kolizjom na skrzyżowaniu",
    "Autonomiczny system kierowania",
    "Asystent świateł drogowych",
    "Oświetlenie adaptacyjne",
    "Dynamiczne światła doświetlające zakręty",
    "Czujnik zmierzchu",
    "Spryskiwacze reflektorów",
    "Lampy doświetlające zakręt",
    "Światła do jazdy dziennej",
    "Lampy przeciwmgielne",
    "Lampy przeciwmgielne w technologii LED",
    "Lampy tylne w technologii LED",
    "Oświetlenie drogi do domu",
    "System Start/Stop",
    "Elektroniczna kontrola ciśnienia w oponach",
    "Elektryczny hamulec postojowy",
    "Asystent jazdy w korku"
  ]
} as const;

export type EquipmentGroup = keyof typeof equipmentGroups;

export function mapEquipmentToGroups(equipment: string[] | Record<string, string[]> | null | undefined): Record<string, string[]> {
  if (!equipment) {
    return {};
  }

  // Handle array format
  const equipmentList: string[] = Array.isArray(equipment) 
    ? equipment 
    : Object.values(equipment).flat();

  const grouped: Record<string, string[]> = {};

  // Initialize all groups
  Object.keys(equipmentGroups).forEach(group => {
    grouped[group] = [];
  });

  // Map each equipment item to its group
  equipmentList.forEach(item => {
    let found = false;
    
    for (const [groupName, groupItems] of Object.entries(equipmentGroups)) {
      if (groupItems.some(groupItem => groupItem === item)) {
        grouped[groupName].push(item);
        found = true;
        break;
      }
    }
    
    // If item doesn't match any group, add to "Inne"
    if (!found) {
      if (!grouped["Inne"]) {
        grouped["Inne"] = [];
      }
      grouped["Inne"].push(item);
    }
  });

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(grouped).filter(([_, items]) => items.length > 0)
  );
}

export function getAllEquipmentGroups(): string[] {
  return Object.keys(equipmentGroups);
}
