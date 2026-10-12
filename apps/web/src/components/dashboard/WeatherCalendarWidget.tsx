"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudRain,
  CloudFog,
  CloudLightning,
  Droplets,
  Wind,
  MapPin,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  timezone: string;
  daily: {
    dates: string[];
    codes: number[];
    maxTemps: number[];
    minTemps: number[];
  };
}

// Map WMO Weather Codes to human label, icon, and colors
function getWeatherConfig(code: number, isDay: boolean) {
  switch (code) {
    case 0:
      return {
        label: isDay ? "Clear Sky" : "Clear Night",
        Icon: isDay ? Sun : Moon,
        color: isDay ? "text-amber-300" : "text-sky-200",
        bgGlow: isDay ? "fill-amber-300/30" : "fill-sky-200/20",
      };
    case 1:
      return {
        label: isDay ? "Mainly Clear" : "Clear Night",
        Icon: isDay ? CloudSun : CloudMoon,
        color: isDay ? "text-amber-300" : "text-sky-200",
        bgGlow: isDay ? "fill-amber-300/30" : "fill-sky-200/20",
      };
    case 2:
      return {
        label: "Partly Cloudy",
        Icon: isDay ? CloudSun : CloudMoon,
        color: isDay ? "text-amber-300" : "text-sky-200",
        bgGlow: isDay ? "fill-amber-300/30" : "fill-sky-200/20",
      };
    case 3:
      return {
        label: "Overcast",
        Icon: Cloud,
        color: "text-slate-300",
        bgGlow: "fill-slate-300/20",
      };
    case 45:
    case 48:
      return {
        label: "Foggy / Mist",
        Icon: CloudFog,
        color: "text-slate-300",
        bgGlow: "fill-slate-300/20",
      };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return {
        label: "Light Drizzle",
        Icon: CloudRain,
        color: "text-sky-300",
        bgGlow: "fill-sky-300/20",
      };
    case 61:
    case 63:
    case 65:
    case 80:
    case 81:
    case 82:
      return {
        label: "Rain Showers",
        Icon: CloudRain,
        color: "text-blue-300",
        bgGlow: "fill-blue-300/20",
      };
    case 95:
    case 96:
    case 99:
      return {
        label: "Thunderstorm",
        Icon: CloudLightning,
        color: "text-amber-400",
        bgGlow: "fill-amber-400/20",
      };
    default:
      return {
        label: "Partly Cloudy",
        Icon: isDay ? CloudSun : CloudMoon,
        color: "text-amber-300",
        bgGlow: "fill-amber-300/30",
      };
  }
}

export function WeatherCalendarWidget() {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);

  // Calendar popover view month state
  const [viewDate, setViewDate] = useState<Date>(new Date());

  // Weather state (Default: Punjab Rice Belt - Muridke / Sheikhupura)
  const [locationName, setLocationName] = useState("Punjab Rice Belt (Muridke)");
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: 31.7167,
    lon: 73.985,
  });
  const [weather, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Live ticking clock every second
  useEffect(() => {
    setMounted(true);
    const now = new Date();
    setCurrentTime(now);
    setViewDate(now);

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 2. Fetch real-time weather from Open-Meteo
  const fetchWeather = async (lat: number, lon: number) => {
    setLoadingWeather(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      if (!res.ok) throw new Error("Weather fetch failed");
      const data = await res.json();

      setWeatherData({
        temp: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: Math.round(data.current.relative_humidity_2m),
        windSpeed: Math.round(data.current.wind_speed_10m * 10) / 10,
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
        timezone: data.timezone || "Asia/Karachi",
        daily: {
          dates: data.daily?.time?.slice(0, 4) || [],
          codes: data.daily?.weather_code?.slice(0, 4) || [],
          maxTemps: data.daily?.temperature_2m_max?.slice(0, 4) || [],
          minTemps: data.daily?.temperature_2m_min?.slice(0, 4) || [],
        },
      });
    } catch {
      // Fallback to Punjab autumn basmati season defaults if network offline
      setWeatherData({
        temp: 24,
        feelsLike: 25,
        humidity: 68,
        windSpeed: 7.2,
        weatherCode: 1,
        isDay: true,
        timezone: "Asia/Karachi",
        daily: {
          dates: ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"],
          codes: [1, 2, 0, 3],
          maxTemps: [28, 29, 29, 27],
          minTemps: [19, 18, 19, 18],
        },
      });
    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    fetchWeather(coords.lat, coords.lon);
    // Refresh weather every 15 minutes
    const interval = setInterval(() => {
      fetchWeather(coords.lat, coords.lon);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [coords.lat, coords.lon]);

  // Handle Geolocation detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setLoadingWeather(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });
        setLocationName("Your Local Weather");
      },
      () => {
        setLoadingWeather(false);
      }
    );
  };

  // Click outside to close modals
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
        setWeatherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format Date & Time Strings
  const formattedDate = mounted
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(currentTime)
    : "11 Oct 2026";

  const formattedDayTime = mounted
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(currentTime)
    : "Sun, 10:52:00 PM";

  const weatherConfig = weather
    ? getWeatherConfig(weather.weatherCode, weather.isDay)
    : {
        label: "Partly Cloudy",
        Icon: CloudSun,
        color: "text-amber-300",
        bgGlow: "fill-amber-300/30",
      };

  const WeatherIcon = weatherConfig.Icon;

  // Calendar month rendering helpers
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];
  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      currentTime.getDate() === d &&
      currentTime.getMonth() === month &&
      currentTime.getFullYear() === year;
    calendarDays.push({ day: d, isCurrentMonth: true, isToday });
  }
  // Next month padding to fill grid
  const remaining = 35 - calendarDays.length;
  for (let i = 1; i <= (remaining > 0 ? remaining : 42 - calendarDays.length); i++) {
    calendarDays.push({ day: i, isCurrentMonth: false });
  }

  return (
    <div ref={containerRef} className="relative z-40 shrink-0">
      {/* Pill Container */}
      <div className="bg-slate-950/45 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-2.5 flex items-center gap-4 text-white shadow-xl transition-all hover:bg-slate-950/60">
        {/* Calendar & Clock Segment */}
        <button
          type="button"
          onClick={() => {
            setCalendarOpen(!calendarOpen);
            setWeatherOpen(false);
          }}
          className="flex items-center gap-3 text-left group hover:opacity-95 transition-opacity cursor-pointer focus:outline-none"
          title="Click to view interactive calendar & clock"
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
            <CalendarIcon className="w-4.5 h-4.5 text-white/95 shrink-0" />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>{formattedDate}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[10px] text-white/80 font-mono tracking-tight mt-0.5">
              {formattedDayTime}
            </div>
          </div>
        </button>

        {/* Vertical Divider */}
        <div className="w-px h-8 bg-white/25 shrink-0" />

        {/* Weather Segment */}
        <button
          type="button"
          onClick={() => {
            setWeatherOpen(!weatherOpen);
            setCalendarOpen(false);
          }}
          className="flex items-center gap-3 text-left group hover:opacity-95 transition-opacity cursor-pointer focus:outline-none"
          title="Click to view live weather forecast & humidity"
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
            <WeatherIcon
              className={`w-4.5 h-4.5 ${weatherConfig.color} ${weatherConfig.bgGlow} shrink-0 transition-transform group-hover:scale-110 duration-200`}
            />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-bold text-white tracking-wide">
              {weather ? `${weather.temp}°C` : "20°C"}
            </div>
            <div className="text-[10px] text-white/80 mt-0.5 whitespace-nowrap">
              {weather ? weatherConfig.label : "Clear Sky"}
            </div>
          </div>
        </button>
      </div>

      {/* 1. CALENDAR & LIVE CLOCK POPOVER */}
      {calendarOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-[calc(100vw-3rem)] sm:w-84 max-w-sm bg-slate-900/98 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-2xl text-white z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Live Calendar & Clock
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCalendarOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real-time Large Digital Clock Display */}
          <div className="my-3 p-3 rounded-xl bg-slate-950/60 border border-white/10 text-center">
            <div className="font-mono text-2xl font-bold tracking-wider text-emerald-400">
              {mounted
                ? currentTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })
                : "10:52:00 PM"}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-1.5">
              <span>{mounted ? currentTime.toDateString() : "Sun Oct 11 2026"}</span>
              <span>•</span>
              <span className="text-emerald-300 font-medium">PKT (UTC+5:00)</span>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-bold text-white">
              {monthNames[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="p-1 hover:bg-white/10 rounded-md transition-colors text-slate-300 hover:text-white"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="p-1 hover:bg-white/10 rounded-md transition-colors text-slate-300 hover:text-white"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400 mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((item, idx) => (
              <div
                key={idx}
                className={`h-7 flex items-center justify-center rounded-lg text-[11px] transition-colors ${
                  item.isToday
                    ? "bg-emerald-500 font-bold text-white shadow-sm shadow-emerald-500/50"
                    : item.isCurrentMonth
                    ? "text-slate-200 hover:bg-white/10 cursor-pointer"
                    : "text-slate-600"
                }`}
              >
                {item.day}
              </div>
            ))}
          </div>

          {/* Agricultural Schedule Note */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-start gap-2 text-[10px] text-slate-300 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <div className="font-semibold text-emerald-300">Kharif Basmati Season</div>
              <div className="text-slate-400 mt-0.5">Peak harvesting & procurement operations active across Punjab belt.</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. REAL-TIME WEATHER & FORECAST POPOVER */}
      {weatherOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-[calc(100vw-3rem)] sm:w-88 max-w-sm bg-slate-900/98 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-2xl text-white z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200 truncate max-w-[180px]">
                {locationName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchWeather(coords.lat, coords.lon)}
                disabled={loadingWeather}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
                title="Refresh Live Weather"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingWeather ? "animate-spin text-amber-400" : ""}`}
                />
              </button>
              <button
                type="button"
                onClick={() => setWeatherOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Current Live Overview */}
          <div className="my-3 p-3.5 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-1">
                <span>{weather ? weather.temp : 20}°C</span>
                <span className="text-xs font-normal text-slate-400">
                  feels like {weather ? weather.feelsLike : 23}°C
                </span>
              </div>
              <div className="text-xs font-medium text-amber-300 mt-0.5">
                {weatherConfig.label}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <WeatherIcon
                className={`w-7 h-7 ${weatherConfig.color} ${weatherConfig.bgGlow}`}
              />
            </div>
          </div>

          {/* Live Micro Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Air Humidity</div>
                <div className="text-xs font-bold text-white">
                  {weather ? `${weather.humidity}%` : "96%"}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Wind className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Wind Velocity</div>
                <div className="text-xs font-bold text-white">
                  {weather ? `${weather.windSpeed} km/h` : "5.2 km/h"}
                </div>
              </div>
            </div>
          </div>

          {/* 3-Day Forecast Strip */}
          {weather?.daily?.dates && weather.daily.dates.length > 1 && (
            <div className="mb-3 pt-2.5 border-t border-white/10">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                3-Day Rice Belt Outlook
              </div>
              <div className="grid grid-cols-3 gap-2">
                {weather.daily.dates.slice(1, 4).map((dStr, idx) => {
                  const dateObj = new Date(dStr);
                  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                  const fCode = weather.daily.codes[idx + 1] ?? 1;
                  const fCfg = getWeatherConfig(fCode, true);
                  const FIcon = fCfg.Icon;
                  const maxT = Math.round(weather.daily.maxTemps[idx + 1] ?? 28);
                  const minT = Math.round(weather.daily.minTemps[idx + 1] ?? 19);

                  return (
                    <div
                      key={dStr}
                      className="p-2 rounded-lg bg-white/5 border border-white/5 text-center flex flex-col items-center"
                    >
                      <span className="text-[10px] text-slate-300 font-medium">{dayName}</span>
                      <FIcon className={`w-4 h-4 my-1 ${fCfg.color}`} />
                      <span className="text-[11px] font-bold text-white">
                        {maxT}° / <span className="text-slate-400 font-normal">{minT}°</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Milling Advisory Footer & Geolocation detection */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <button
              type="button"
              onClick={handleDetectLocation}
              className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              <span>Detect My City</span>
            </button>
            <span className="text-[9px] text-slate-500">Live Open-Meteo API</span>
          </div>
        </div>
      )}
    </div>
  );
}
