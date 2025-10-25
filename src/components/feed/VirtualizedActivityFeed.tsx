import { ActivityCard } from './ActivityCard';

interface Props {
  activities: any[];
}

export function VirtualizedActivityFeed({ activities }: Props) {
  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <ActivityCard 
          key={activity.id}
          activity={activity} 
          onActivityUpdate={() => {}}
          index={index}
        />
      ))}
    </div>
  );
}
