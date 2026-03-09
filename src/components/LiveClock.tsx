import { useState, useEffect } from "react";

export function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = time.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateStr = time.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="text-center">
      <p className="text-6xl font-heading font-bold tracking-tight text-foreground tabular-nums">
        {timeStr}
      </p>
      <p className="mt-2 text-muted-foreground capitalize text-lg">{dateStr}</p>
    </div>
  );
}
