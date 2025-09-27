import React from "react";

interface Activity {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
}

interface Props {
  activities: Activity[];
}

export default function ActivityList({ activities }: Props) {
  return (
    <div>
      {activities.map((a) => (
        <div key={a.id} className="border p-4 rounded mb-4 shadow">
          <h2 className="text-xl font-bold">{a.name}</h2>
          <p>{a.description}</p>
          <p>
            วันที่: {new Date(a.start_date).toLocaleDateString()} - {new Date(a.end_date).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
