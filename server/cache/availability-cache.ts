
import { Slot } from '../types/slots';

export class AvailabilityCache {
  private cache = new Map<string, Slot[]>();
  
  get(key: string): Slot[] | undefined {
    return this.cache.get(key);
  }
  
  set(key: string, slots: Slot[], ttl = 300): void {
    this.cache.set(key, slots);
    setTimeout(() => this.cache.delete(key), ttl * 1000);
  }

  generateKey(providerId: number, date: string, duration: number): string {
    return `${providerId}-${date}-${duration}`;
  }
}

export const availabilityCache = new AvailabilityCache();
