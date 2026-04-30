import { ConflictEvent } from '../../domain/entities/ConflictEvent';
import { IConflictEventRepository } from '../../domain/repositories/IConflictEventRepository';

export class ConflictDataService {
  constructor(private readonly repository: IConflictEventRepository) {}

  async getAllEvents(): Promise<ConflictEvent[]> {
    return this.repository.getAll();
  }

  async getEventsByCountry(iso: number): Promise<ConflictEvent[]> {
    const events = await this.repository.getAll();
    return events.filter((e) => e.iso === iso);
  }

  async getEventsByDateRange(from: string, to: string): Promise<ConflictEvent[]> {
    const events = await this.repository.getAll();
    const fromTs = new Date(from).getTime();
    const toTs = new Date(to).getTime();
    return events.filter((e) => {
      const ts = new Date(e.eventDate).getTime();
      return ts >= fromTs && ts <= toTs;
    });
  }
}
