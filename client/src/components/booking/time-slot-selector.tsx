import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, Clock, AlertCircle, Loader2 } from "lucide-react";
import {
  formatTime,
  addMinutesToTime,
  ProviderSchedule,
  TimeSlot,
  Service,
  isWithinWorkingHours,
  isNotBlocked,
  hasNoOverlap,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TimeSlotSelectorProps {
  providerId: number | string;
  date: string;
  service?: Service | null;
  onTimeSlotSelect: (timeSlot: TimeSlot | undefined) => void;
  selectedTimeSlot?: TimeSlot | null;
}

export function TimeSlotSelector({
  providerId,
  date,
  service,
  onTimeSlotSelect,
  selectedTimeSlot,
}: TimeSlotSelectorProps) {
  
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [providerSchedule, setProviderSchedule] =
    useState<ProviderSchedule | null>(null);
  const [existingBookings, setExistingBookings] = useState<TimeSlot[]>([]);
  const { toast } = useToast();

  // Log para mostrar os timeSlots
  

  // Reset selection when service changes
  useEffect(() => {
    if (service && selectedTimeSlot) {
      onTimeSlotSelect(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  // Load provider schedule and existing bookings
  const loadData = useCallback(async () => {
    if (!providerId || !date) return;

    setIsLoading(true);
    try {
      // Load provider schedule
      const scheduleResponse = await apiRequest(
        "GET",
        `/api/providers/${providerId}/schedule`,
      );
      if (!scheduleResponse.ok) {
        throw new Error("Failed to load provider schedule");
      }
      const scheduleData = await scheduleResponse.json();
      
      // Transform blockedTimesByDate to blockedSlots format
      const blockedSlots = [];
      if (scheduleData.blockedTimesByDate) {
        for (const [blockDate, blocks] of Object.entries(scheduleData.blockedTimesByDate)) {
          for (const block of blocks as any[]) {
            blockedSlots.push({
              date: blockDate,
              startTime: block.startTime,
              endTime: block.endTime,
              reason: block.reason
            });
          }
        }
      }
      
      // Create provider schedule object
      const providerScheduleObj = {
        startTime: "08:00", // Default values, should be from availabilityByDay
        endTime: "18:00",
        workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
        blockedSlots: blockedSlots,
        timeSlotInterval: 30
      };
      
      setProviderSchedule(providerScheduleObj);

      // Load existing bookings for the day
      const bookingsResponse = await apiRequest(
        "GET",
        `/api/bookings?providerId=${providerId}&date=${date}`,
      );
      if (!bookingsResponse.ok) {
        throw new Error("Failed to load existing bookings");
      }
      const bookingsData = await bookingsResponse.json();
      setExistingBookings(bookingsData.bookings || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load provider availability",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [providerId, date, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Validate a single time slot
  const validateSlot = useCallback(
    (slot: TimeSlot): boolean => {
      if (!slot || !slot.startTime || !providerSchedule) {
        return false;
      }

      const duration =
        service?.durationMinutes || providerSchedule.timeSlotInterval;
      const slotEnd =
        slot.endTime || addMinutesToTime(slot.startTime, duration);

      return (
        slot.isAvailable === true &&
        isWithinWorkingHours(slot, providerSchedule, duration) &&
        isNotBlocked(slot, providerSchedule.blockedSlots, date, duration) &&
        hasNoOverlap(slot, existingBookings, duration)
      );
    },
    [providerSchedule, existingBookings, service, date],
  );

  // Fetch and process time slots
  useEffect(() => {
    if (!providerId || !date || !providerSchedule) return;

    const fetchTimeSlots = async () => {
      setIsLoading(true);
      try {
        // Sempre usar o endpoint tradicional
        const url = `/api/providers/${providerId}/time-slots?date=${date}&duration=${service?.durationMinutes || 30}`;
        const response = await apiRequest("GET", url);
        const data = await response.json();
        
        const slots = Array.isArray(data) ? data : data.timeSlots || [];

        // Filter today's past time slots
        const today = new Date().toISOString().split("T")[0];
        const now = new Date();

        const processedSlots = slots
          .filter((slot: TimeSlot) => {
            if (date === today) {
              const [hours, minutes] = slot.startTime.split(":").map(Number);
              const slotTime = new Date();
              slotTime.setHours(hours, minutes, 0, 0);
              return slotTime > now;
            }
            return true;
          })
          .map((slot: TimeSlot) => {
            const duration =
              service?.durationMinutes || providerSchedule.timeSlotInterval;
            return {
              ...slot,
              endTime:
                slot.endTime || addMinutesToTime(slot.startTime, duration),
              formattedSlot: `${formatTime(slot.startTime)} - ${formatTime(
                addMinutesToTime(slot.startTime, duration),
              )}`,
            };
          });

        const validatedSlots = processedSlots.filter(validateSlot);
        setTimeSlots(validatedSlots);
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not load available time slots",
          variant: "destructive",
        });
        setTimeSlots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeSlots();
  }, [providerId, date, service, providerSchedule, validateSlot, toast]);

  // Check if provider works on the selected date
  const isWorkingDay = providerSchedule
    ? providerSchedule.workingDays.includes(new Date(date).getDay())
    : false;

  // Check if provider works during specific period
  const isAvailablePeriod = useCallback(
    (period: string): boolean => {
      if (!providerSchedule) return true;

      const [periodStart, periodEnd] =
        period === "morning"
          ? ["06:00", "12:00"]
          : period === "afternoon"
            ? ["12:00", "18:00"]
            : ["18:00", "23:59"];

      return !(
        periodEnd <= providerSchedule.startTime ||
        periodStart >= providerSchedule.endTime
      );
    },
    [providerSchedule],
  );

  const handleSlotClick = async (slot: TimeSlot) => {
    if (!slot.isAvailable) return;

    setIsSelecting(true);
    try {
      const duration =
        service?.durationMinutes || providerSchedule?.timeSlotInterval || 0;
      const endTime =
        slot.endTime || addMinutesToTime(slot.startTime, duration);

      onTimeSlotSelect({
        ...slot,
        endTime,
        formattedSlot: `${formatTime(slot.startTime)} - ${formatTime(endTime)}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not select time slot",
        variant: "destructive",
      });
    } finally {
      setIsSelecting(false);
    }
  };

  // Check if slot is near provider's closing time
  const isSlotNearClosing = useCallback(
    (slot: TimeSlot): boolean => {
      if (!providerSchedule || !service) return false;

      const duration = service.durationMinutes + (service.bufferTime || 0);
      const slotEnd = addMinutesToTime(slot.startTime, duration);
      const closingTime = providerSchedule.endTime;

      const [endHour, endMinute] = slotEnd.split(":").map(Number);
      const [closeHour, closeMinute] = closingTime.split(":").map(Number);

      return (
        endHour > closeHour ||
        (endHour === closeHour && endMinute > closeMinute)
      );
    },
    [providerSchedule, service],
  );

  // Group time slots by period
  const { morningSlots, afternoonSlots, eveningSlots } = useMemo(() => {
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];
    const evening: TimeSlot[] = [];

    timeSlots.forEach((slot) => {
      const hour = parseInt(slot.startTime.split(":")[0]);
      if (hour >= 6 && hour < 12) {
        morning.push(slot);
      } else if (hour >= 12 && hour < 18) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return {
      morningSlots: morning,
      afternoonSlots: afternoon,
      eveningSlots: evening,
    };
  }, [timeSlots]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // No provider schedule loaded
  if (!providerSchedule) {
    // Se temos timeSlots mas não temos providerSchedule, mostrar os horários mesmo assim
    if (timeSlots.length > 0) {
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {timeSlots.map((slot) => (
              <Button
                key={`${slot.startTime}-${slot.availabilityId || ""}`}
                variant={
                  selectedTimeSlot?.startTime === slot.startTime
                    ? "default"
                    : "outline"
                }
                size="sm"
                className="justify-start relative"
                onClick={() => handleSlotClick(slot)}
                disabled={isSelecting}
              >
                {isSelecting && selectedTimeSlot?.startTime === slot.startTime ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="flex-1 text-center">
                      {formatTime(slot.startTime)}
                      {slot.endTime && ` - ${formatTime(slot.endTime)}`}
                    </span>
                    {selectedTimeSlot?.startTime === slot.startTime && (
                      <Check className="h-4 w-4 absolute right-2" />
                    )}
                  </>
                )}
              </Button>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center justify-center py-6 space-y-2">
            <Clock className="h-12 w-12 text-muted-foreground mb-2" />
            <h3 className="font-medium text-lg">Loading provider schedule</h3>
            <p className="text-muted-foreground">
              Please wait while we load the provider's availability details.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not a working day
  if (!isWorkingDay) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center justify-center py-6 space-y-2">
            <AlertCircle className="h-12 w-12 text-orange-500 mb-2" />
            <h3 className="font-medium text-lg">Not available</h3>
            <p className="text-muted-foreground">
              The provider doesn't work on this day of the week. Please choose
              another date.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No available time slots
  if (timeSlots.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <Clock className="h-12 w-12 text-muted-foreground mb-2" />
            <h3 className="font-medium text-lg">No available time slots</h3>
            <p className="text-muted-foreground">
              {service
                ? `There are no available time slots for ${service.name} on this date. Please try another day.`
                : "There are no available time slots for this date. Please try another day."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render a group of time slots
  const renderTimeSlotGroup = (
    slots: TimeSlot[],
    title: string,
    period: "morning" | "afternoon" | "evening",
  ) => {
    if (slots.length === 0 || !isAvailablePeriod(period)) return null;

    return (
      <div className="mb-6">
        <h3 className="font-medium text-sm text-muted-foreground mb-3">
          {title}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {slots.map((slot) => (
            <Button
              key={`${slot.startTime}-${slot.availabilityId || ""}`}
              variant={
                selectedTimeSlot?.startTime === slot.startTime
                  ? "default"
                  : "outline"
              }
              size="sm"
              className={cn(
                "justify-start relative",
                selectedTimeSlot?.startTime === slot.startTime
                  ? "border-primary"
                  : "",
                isSlotNearClosing(slot)
                  ? "bg-amber-50 dark:bg-amber-950/20"
                  : "",
                typeof slot.score === "number" && slot.score >= 80
                  ? "border-green-500 border-2 bg-green-50 dark:bg-green-900/20"
                  : "",
                typeof slot.score === "number" && slot.score >= 50
                  ? "border-blue-400 border"
                  : "",
              )}
              onClick={() => handleSlotClick(slot)}
              disabled={isSelecting}
            >
              {isSelecting && selectedTimeSlot?.startTime === slot.startTime ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span className="flex-1 text-center">
                    {formatTime(slot.startTime)}
                    {service &&
                      ` - ${formatTime(slot.endTime || addMinutesToTime(slot.startTime, service.durationMinutes))}`}
                  </span>
                  {selectedTimeSlot?.startTime === slot.startTime && (
                    <Check className="h-4 w-4 absolute right-2" />
                  )}
                </>
              )}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {renderTimeSlotGroup(morningSlots, "Morning", "morning")}
      {renderTimeSlotGroup(afternoonSlots, "Afternoon", "afternoon")}
      {renderTimeSlotGroup(eveningSlots, "Evening", "evening")}
    </div>
  );
}
