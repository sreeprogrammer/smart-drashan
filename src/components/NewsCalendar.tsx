import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import {
  type NewsArticle,
  eventDateLabel,
  formatIsoDate,
  todayIso,
} from '@/lib/news';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface NewsCalendarProps {
  events: NewsArticle[];
}

function buildEventsByDay(events: NewsArticle[]): Map<string, NewsArticle[]> {
  const map = new Map<string, NewsArticle[]>();
  for (const event of events) {
    if (!event.event_start_date) continue;
    const last = new Date(`${event.event_end_date ?? event.event_start_date}T00:00:00`);
    for (let day = new Date(`${event.event_start_date}T00:00:00`); day <= last; day.setDate(day.getDate() + 1)) {
      const key = formatIsoDate(day);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
  }
  return map;
}

export default function NewsCalendar({ events }: NewsCalendarProps) {
  const today = todayIso();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);

  const eventsByDay = useMemo(() => buildEventsByDay(events), [events]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leadingBlanks = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const selectedEvents = eventsByDay.get(selected) ?? [];

  const shiftMonth = (delta: number) => setMonth(new Date(year, monthIndex + delta, 1));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 bg-white rounded-xl border border-navy-900/10 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-2 rounded-lg border border-navy-900/20 hover:border-maroon-deep"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-serif text-lg font-bold text-navy-900">{monthLabel}</h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="p-2 rounded-lg border border-navy-900/20 hover:border-maroon-deep"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-navy-900/60 mb-2">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (day === null) return <span key={`blank-${index}`} />;
            const iso = formatIsoDate(new Date(year, monthIndex, day));
            const count = eventsByDay.get(iso)?.length ?? 0;
            const isSelected = iso === selected;
            const isToday = iso === today;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                aria-pressed={isSelected}
                className={`relative aspect-square rounded-lg text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-maroon-deep text-white'
                    : count > 0
                      ? 'bg-gold-100 text-navy-900 hover:bg-gold-200'
                      : 'text-navy-900 hover:bg-cream'
                } ${isToday && !isSelected ? 'ring-2 ring-navy-900/40' : ''}`}
              >
                {day}
                {count > 0 && (
                  <span
                    className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-gold-300' : 'bg-maroon-deep'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
        {events.length === 0 && (
          <p className="text-center text-sm text-navy-900/60 mt-6">No verified events are listed for this view.</p>
        )}
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl border border-navy-900/10 p-4 sm:p-5">
        <h3 className="font-serif text-lg font-bold text-navy-900 mb-1">
          {new Date(`${selected}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </h3>
        <p className="text-xs text-navy-900/60 mb-4">
          {selected === today ? "Today's events" : selected < today ? 'Past day' : 'Upcoming day'}
        </p>

        {selectedEvents.length === 0 ? (
          <p className="text-sm text-navy-900/60 py-8 text-center">No verified events on this day.</p>
        ) : (
          <ul className="space-y-3">
            {selectedEvents.map((event) => {
              const ended = (event.event_end_date ?? event.event_start_date ?? '') < today;
              return (
                <li key={event.id}>
                  <Link
                    to={`/news/${event.id}`}
                    className="block rounded-lg border border-navy-900/10 p-3 hover:border-maroon-deep hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                      <span className={`font-semibold px-2 py-0.5 rounded-full ${ended ? 'bg-navy-900/10 text-navy-900' : 'bg-emerald-100 text-emerald-800'}`}>
                        {ended ? 'Past' : 'Upcoming'}
                      </span>
                      {event.event_status !== 'scheduled' && (
                        <span className="font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                          {event.event_status === 'cancelled' ? 'Cancelled' : 'Postponed'}
                        </span>
                      )}
                      {event.is_recurring_annual && (
                        <span className="inline-flex items-center gap-1 text-navy-900/70">
                          <Repeat className="w-3 h-3" /> Annual festival
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-navy-900 text-sm line-clamp-2">{event.headline}</p>
                    <p className="text-xs text-maroon-deep mt-1">
                      {[event.temple?.name, event.district?.name].filter(Boolean).join(' · ') || 'Information not yet verified'}
                    </p>
                    <p className="text-xs text-navy-900/60 mt-1">
                      {eventDateLabel(event)}
                      {event.event_timings ? ` · ${event.event_timings}` : ''}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
