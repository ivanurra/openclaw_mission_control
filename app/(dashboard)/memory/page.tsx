'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, Search, Star, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import type { DayConversation } from '@/types';
import { cn } from '@/lib/utils/cn';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay, addMonths, subMonths } from 'date-fns';

export default function MemoryPage() {
  const searchParams = useSearchParams();
  const queryDate = searchParams.get('date');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [conversation, setConversation] = useState<DayConversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ date: string; excerpt: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [memoryRes, favoritesRes] = await Promise.all([
        fetch('/api/memory'),
        fetch('/api/memory/favorites'),
      ]);
      const [memoryData, favoritesData] = await Promise.all([
        memoryRes.json(),
        favoritesRes.json(),
      ]);
      setAvailableDates(memoryData.dates || []);
      setFavorites(favoritesData.favorites || []);

      const requestedDate =
        queryDate && memoryData.dates?.includes(queryDate) ? queryDate : memoryData.dates?.[0];
      setSelectedDate(requestedDate || null);
    } catch (error) {
      console.error('Failed to fetch memory data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [queryDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchConversation = useCallback(async (date: string) => {
    setIsConversationLoading(true);
    try {
      const res = await fetch(`/api/memory?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setConversation(data);
      } else {
        setConversation({ date, messages: [] });
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      setConversation({ date, messages: [] });
    } finally {
      setIsConversationLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchConversation(selectedDate);
    } else {
      setConversation(null);
    }
  }, [fetchConversation, selectedDate]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/memory/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleToggleFavorite(date: string) {
    try {
      const res = await fetch('/api/memory/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      setFavorites(data.favorites || []);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }

  function renderCalendar() {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = getDay(monthStart);

    const availableDatesSet = new Set(availableDates);
    const favoritesSet = new Set(favorites);

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-medium text-[var(--text-primary)]">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-center text-xs text-[var(--text-muted)] py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}

          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const hasConversation = availableDatesSet.has(dateStr);
            const isFavorite = favoritesSet.has(dateStr);
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  'h-8 rounded-lg text-sm relative transition-colors',
                  hasConversation
                    ? 'text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]',
                  isSelected && 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]',
                  isToday(day) && !isSelected && 'ring-1 ring-[var(--accent-primary)]'
                )}
              >
                {format(day, 'd')}
                {isFavorite && (
                  <Star
                    size={8}
                    className="absolute top-0.5 right-0.5 fill-yellow-500 text-yellow-500"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-72 flex-shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-secondary)] flex flex-col">
        <div className="p-4 border-b border-[var(--border-default)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Bot Memory</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">OpenClaw conversations</p>
        </div>

        <form onSubmit={handleSearch} className="p-4 border-b border-[var(--border-default)]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]"
            />
          </div>
        </form>

        <div className="flex-1 overflow-y-auto">
          {searchResults.length > 0 ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--text-muted)]">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setSearchResults([])}
                  className="text-xs text-[var(--accent-primary)] hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {searchResults.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedDate(result.date);
                      setSearchResults([]);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <span className="text-xs text-[var(--accent-primary)]">{result.date}</span>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                      {result.excerpt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            renderCalendar()
          )}
        </div>

        {favorites.length > 0 && (
          <div className="p-4 border-t border-[var(--border-default)]">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] mb-2 flex items-center gap-1">
              <Star size={12} />
              Favorites
            </h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {favorites.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'w-full text-left px-2 py-1 rounded text-sm transition-colors',
                    selectedDate === date
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                  )}
                >
                  {date}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedDate ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-[var(--text-muted)]" />
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
                </h1>
              </div>
              <button
                onClick={() => handleToggleFavorite(selectedDate)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  favorites.includes(selectedDate)
                    ? 'text-yellow-500 bg-yellow-500/10'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                )}
              >
                <Star size={20} className={favorites.includes(selectedDate) ? 'fill-current' : ''} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isConversationLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]" />
                </div>
              ) : (conversation?.messages.length ?? 0) > 0 ? (
                <div className="max-w-3xl mx-auto space-y-4">
                  {conversation?.messages.map((message, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex gap-3',
                        message.role === 'user' && 'flex-row-reverse'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-xl px-4 py-3',
                          message.role === 'user'
                            ? 'bg-[var(--accent-primary)] text-white'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-default)]'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium opacity-70">
                            {message.role === 'user' ? 'You' : 'Bot'}
                          </span>
                          {message.timestamp && (
                            <span className="text-xs opacity-50">{message.timestamp}</span>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-[var(--text-muted)]">No messages for this day.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="No date selected"
            description="Select any day in the calendar to view the chat."
            className="flex-1"
          />
        )}
      </div>
    </div>
  );
}
