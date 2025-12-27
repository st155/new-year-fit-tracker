import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { 
  Plus, 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useScheduleEvents } from '@/hooks/useScheduleEvents';
import { ScheduleEventDialog } from './ScheduleEventDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';

export function TrainerCalendar() {
  const { t, i18n } = useTranslation('trainer');
  const locale = i18n.language === 'ru' ? ru : enUS;
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { events, loading, createEvent, updateEvent, deleteEvent, toggleCompleted } = useScheduleEvents(
    startOfWeek(monthStart, { locale }),
    endOfWeek(monthEnd, { locale })
  );

  const EVENT_TYPE_COLORS: Record<string, string> = {
    workout: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    consultation: 'bg-green-500/20 text-green-400 border-green-500/30',
    reminder: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    other: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  const getEventTypeLabel = (type: string) => {
    return t(`calendar.eventTypes.${type}`) || type;
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleSaveEvent = async (eventData: any) => {
    if (selectedEvent) {
      await updateEvent(selectedEvent.id, eventData);
    } else {
      await createEvent(eventData);
    }
  };

  const handleDeleteClick = (eventId: string) => {
    setEventToDelete(eventId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (eventToDelete) {
      await deleteEvent(eventToDelete);
      setEventToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.start_time), date)
    );
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t('calendar.title')}</h2>
          <p className="text-muted-foreground">{t('calendar.subtitle')}</p>
        </div>
        <Button onClick={handleCreateEvent} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('calendar.createEvent')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {format(currentDate, 'LLLL yyyy', { locale })}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentDate}
              onMonthChange={setCurrentDate}
              locale={locale}
              className="rounded-md border"
              modifiers={{
                hasEvents: (date) => getEventsForDate(date).length > 0,
              }}
              modifiersClassNames={{
                hasEvents: 'bg-primary/10 font-bold',
              }}
            />
          </CardContent>
        </Card>

        {/* Events List for Selected Date */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedDate ? format(selectedDate, 'd MMMM', { locale }) : t('calendar.events')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('calendar.noEvents')}</p>
                <Button 
                  variant="link" 
                  onClick={() => {
                    setSelectedEvent(null);
                    setDialogOpen(true);
                  }}
                  className="mt-2"
                >
                  {t('calendar.createEvent')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {selectedDateEvents.map((event) => (
                  <Card 
                    key={event.id} 
                    className={`border ${EVENT_TYPE_COLORS[event.event_type]} transition-all hover:shadow-md`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getEventTypeLabel(event.event_type)}
                            </Badge>
                            {event.is_completed && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {event.is_cancelled && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <h4 className="font-semibold">{event.title}</h4>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditEvent(event)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('calendar.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleCompleted(event.id, !event.is_completed)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {event.is_completed ? t('calendar.markIncomplete') : t('calendar.markComplete')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(event.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('calendar.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(event.start_time), 'HH:mm', { locale })} - {format(new Date(event.end_time), 'HH:mm', { locale })}
                          </span>
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}

                        {event.client && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={event.client.avatar_url} />
                              <AvatarFallback>
                                {event.client.full_name?.[0] || event.client.username?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span>{event.client.full_name || event.client.username}</span>
                          </div>
                        )}

                        {event.training_plan && (
                          <div className="text-xs text-muted-foreground">
                            {t('calendar.plan')} {event.training_plan.name}
                          </div>
                        )}

                        {event.description && (
                          <p className="text-xs pt-2 border-t">{event.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ScheduleEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        onSave={handleSaveEvent}
        defaultDate={selectedDate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('calendar.deleteEvent')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('calendar.deleteEventDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('calendar.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>{t('calendar.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
