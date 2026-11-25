import { Building2, Bus, CalendarDays, Clock, Hotel, Phone, Siren, Users } from 'lucide-react';
import type { TempleInformationSection as SectionKey } from '@/lib/supabase';

export const TEMPLE_INFORMATION_SECTIONS: Array<{
  id: SectionKey;
  title: string;
  icon: typeof Phone;
}> = [
  { id: 'administration', title: 'Temple Administration', icon: Users },
  { id: 'facilities', title: 'Facilities', icon: Building2 },
  { id: 'transportation', title: 'Transportation', icon: Bus },
  { id: 'emergency', title: 'Emergency Services', icon: Siren },
  { id: 'hotels', title: 'Nearby Hotels', icon: Hotel },
  { id: 'timings', title: 'Darshan Timings', icon: Clock },
  { id: 'festivals', title: 'Festivals & Events', icon: CalendarDays },
];
