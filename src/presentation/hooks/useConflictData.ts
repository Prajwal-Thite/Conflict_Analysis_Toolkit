import { useState, useEffect } from 'react';
import { ConflictEvent } from '../../domain/entities/ConflictEvent';
import { JsonConflictEventRepository } from '../../infrastructure/repositories/JsonConflictEventRepository';

interface UseConflictDataResult {
  events: ConflictEvent[];
  loading: boolean;
  error: Error | null;
}

const repository = new JsonConflictEventRepository();

export function useConflictData(): UseConflictDataResult {
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    repository
      .getAll()
      .then((data) => {
        setEvents(data.slice(0, 5000));
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error('Failed to load conflict data'));
        setLoading(false);
      });
  }, []);

  return { events, loading, error };
}
