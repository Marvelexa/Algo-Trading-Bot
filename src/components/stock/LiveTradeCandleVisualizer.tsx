import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  CrosshairMode,
  UTCTimestamp
} from "lightweight-charts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Maximize2,
  Minimize2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Target,
  Shield,
  Layers,
  Crosshair
} from "lucide-react";

interface LiveTradeCandleVisualizerProps {
  symbol: string;
  type: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  unrealizedPnLUSD: number;
  quantity?: number;
}

export const LiveTradeCandleVisualizer: React.FC<LiveTradeCandleVisualizerProps> = ({
  symbol,
  type,
  entryPrice,
  currentPrice,
  stopLossPrice,
  targetPrice,
  unrealizedPnLUSD
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [interval, setIntervalState] = useState<"1m" | "3m" | "5m" | "15m" | "1h">("15m");
  const [loading, setLoading] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [crosshairData, setCrosshairData] = useState<{
    time?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    change?: number;
  } | null>(null);

  const [lastFormingCandle, setLastFormingCandle] = useState<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);

  const chartHeight = isExpanded ? 460 : 320;

  const formatP = (p?: number) => {
    if (!p) return "0.00";
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };

  // 1. INITIALIZE TRADINGVIEW LIGHTWEIGHT CHARTS CANVAS
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    container.innerHTML = "";

    const chart = createChart(container, {
      width: container.clientWidth || 700,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#070b12" },
        textColor: "#94a3b8",
        attributionLogo: false
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.45)" },
        horzLines: { color: "rgba(30, 41, 59, 0.45)" }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#38bdf8",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#0284c7"
        },
        horzLine: {
          color: "#38bdf8",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#0284c7"
        }
      },
      rightPriceScale: {
        autoScale: true,
        borderColor: "#1e293b",
        scaleMargins: { top: 0.15, bottom: 0.20 },
        alignLabels: true
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#1e293b",
        rightOffset: 8,
        barSpacing: 10,
        minBarSpacing: 4,
        fixLeftEdge: false,
        fixRightEdge: false
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true
      }
    });

    // Candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: true,
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
      wickVisible: true
    });

    // 🎯 GUARANTEE TP & SL ARE ALWAYS IN VISIBLE VERTICAL VIEWPORT
    candlestickSeries.applyOptions({
      autoscaleInfoProvider: (original: () => any) => {
        const res = original();
        if (!res || !res.priceRange) return res;
        let min = res.priceRange.minValue;
        let max = res.priceRange.maxValue;
        if (stopLossPrice > 0) min = Math.min(min, stopLossPrice);
        if (targetPrice > 0) max = Math.max(max, targetPrice);
        if (entryPrice > 0) {
          min = Math.min(min, entryPrice);
          max = Math.max(max, entryPrice);
        }
        const span = Math.max(1, max - min);
        const pad = span * 0.08;
        return {
          ...res,
          priceRange: {
            minValue: min - pad,
            maxValue: max + pad
          }
        };
      }
    });

    // Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "", // overlay
    });

    // EMA 9 (Cyan)
    const ema9Series = chart.addSeries(LineSeries, {
      color: "#06b6d4",
      lineWidth: 2,
      title: "EMA 9"
    });

    // EMA 21 (Amber)
    const ema21Series = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "EMA 21"
    });

    // 🎯 PRICE LINES: ENTRY, TP (TARGET), SL (STOP LOSS)
    if (entryPrice > 0) {
      candlestickSeries.createPriceLine({
        price: entryPrice,
        color: "#38bdf8",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `⚡ ENTRY: $${formatP(entryPrice)}`
      });
    }

    if (targetPrice > 0) {
      candlestickSeries.createPriceLine({
        price: targetPrice,
        color: "#10b981",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `🎯 TP: $${formatP(targetPrice)} (+1.35R)`
      });
    }

    if (stopLossPrice > 0) {
      candlestickSeries.createPriceLine({
        price: stopLossPrice,
        color: "#ef4444",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `🛑 SL: $${formatP(stopLossPrice)}`
      });
    }

    // Crosshair Subscriber
    chart.subscribeCrosshairMove(param => {
      if (!param.time || !param.seriesData.get(candlestickSeries)) {
        setCrosshairData(null);
        return;
      }
      const bar: any = param.seriesData.get(candlestickSeries);
      if (bar && typeof bar.open === "number") {
        const change = ((bar.close - bar.open) / bar.open) * 100;
        const timeStr = typeof param.time === "number"
          ? new Date(param.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : String(param.time);
        setCrosshairData({
          time: timeStr,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          change
        });
      }
    });

    chartRef.current = chart;
    candleSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    ema9SeriesRef.current = ema9Series;
    ema21SeriesRef.current = ema21Series;

    // Responsive ResizeObserver
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          chart.applyOptions({
            width: entry.contentRect.width,
            height: chartHeight
          });
        }
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ema9SeriesRef.current = null;
      ema21SeriesRef.current = null;
    };
  }, [symbol, entryPrice, targetPrice, stopLossPrice, chartHeight]);

  // 2. FETCH HISTORICAL & LIVE CANDLES FROM API
  useEffect(() => {
    let isMounted = true;
    let timer: any = null;

    const loadCandles = async () => {
      try {
        const res = await fetch(`/api/autotrader/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=75`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !data.success || !Array.isArray(data.candles) || data.candles.length === 0) return;

        // Ensure bars are strictly sorted by time with unique timestamps
        const sortedBars = [...data.candles].sort((a, b) => {
          const tA = typeof a.time === "number" ? a.time : Math.floor(new Date(a.timestamp).getTime() / 1000);
          const tB = typeof b.time === "number" ? b.time : Math.floor(new Date(b.timestamp).getTime() / 1000);
          return tA - tB;
        });

        // Deduplicate timestamps
        const uniqueBars: any[] = [];
        const seenTimes = new Set<number>();
        for (const b of sortedBars) {
          const t = typeof b.time === "number" ? b.time : Math.floor(new Date(b.timestamp).getTime() / 1000);
          if (!seenTimes.has(t) && t > 0) {
            seenTimes.add(t);
            uniqueBars.push({
              time: t as UTCTimestamp,
              open: b.open,
              high: b.high,
              low: b.low,
              close: b.close,
              volume: b.volume || 100
            });
          }
        }

        if (uniqueBars.length === 0) return;

        // Set Candlestick data
        candleSeriesRef.current?.setData(
          uniqueBars.map(b => ({
            time: b.time,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close
          }))
        );

        // Set Volume data
        volumeSeriesRef.current?.setData(
          uniqueBars.map(b => ({
            time: b.time,
            value: b.volume,
            color: b.close >= b.open ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)"
          }))
        );

        // Compute EMA 9
        const calcEmaSeries = (period: number) => {
          const k = 2 / (period + 1);
          const result: { time: UTCTimestamp; value: number }[] = [];
          if (uniqueBars.length === 0) return result;
          let ema = uniqueBars[0].close;
          result.push({ time: uniqueBars[0].time, value: Number(ema.toFixed(2)) });
          for (let i = 1; i < uniqueBars.length; i++) {
            ema = uniqueBars[i].close * k + ema * (1 - k);
            result.push({ time: uniqueBars[i].time, value: Number(ema.toFixed(2)) });
          }
          return result;
        };

        ema9SeriesRef.current?.setData(calcEmaSeries(9));
        ema21SeriesRef.current?.setData(calcEmaSeries(21));

        setLastFormingCandle(uniqueBars[uniqueBars.length - 1]);
        setLoading(false);
      } catch (e) {
        // silent fallback
      }
    };

    loadCandles();
    timer = setInterval(loadCandles, 3500);

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [symbol, interval]);

  // 3. REALTIME TICK STREAM INJECTION (Update forming candle in real-time)
  useEffect(() => {
    if (!candleSeriesRef.current || !lastFormingCandle || currentPrice <= 0) return;

    try {
      const updated: any = {
        time: lastFormingCandle.time as UTCTimestamp,
        open: lastFormingCandle.open,
        high: Math.max(lastFormingCandle.high, currentPrice),
        low: Math.min(lastFormingCandle.low, currentPrice),
        close: currentPrice
      };
      candleSeriesRef.current.update(updated);
    } catch (e) {}
  }, [currentPrice, lastFormingCandle]);

  // Zoom / Pan actions
  const handleZoomIn = () => {
    chartRef.current?.timeScale().zoomIn(0.6);
  };
  const handleZoomOut = () => {
    chartRef.current?.timeScale().zoomOut(0.6);
  };
  const handleResetView = () => {
    chartRef.current?.timeScale().fitContent();
    chartRef.current?.timeScale().resetTimeScale();
  };

  const distToTarget = targetPrice > 0 ? targetPrice - currentPrice : 0;
  const distToSL = stopLossPrice > 0 ? currentPrice - stopLossPrice : 0;

  return (
    <div className="w-full my-3 rounded-2xl bg-gradient-to-b from-[#070b12] via-[#090d16] to-[#070b12] border border-emerald-500/40 shadow-2xl overflow-hidden font-mono select-none">
      {/* 🟢 TOP CONTROL BAR */}
      <div className="p-3 bg-[#0a0f1d] border-b border-gray-800 flex flex-wrap items-center justify-between gap-2.5">
        {/* Symbol & Live Beacon */}
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-wide">
                TRADINGVIEW LIVE {interval.toUpperCase()}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                {symbol}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                type === "BUY" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              }`}>
                {type === "BUY" ? "🟢 LONG" : "🔴 SHORT"}
              </span>
            </div>
          </div>
        </div>

        {/* OHLC HUD / Crosshair Readout */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] bg-[#050811] px-3 py-1 rounded-xl border border-gray-800/80">
          {crosshairData ? (
            <>
              <span className="text-gray-400 font-bold">{crosshairData.time}</span>
              <span>O: <strong className="text-gray-200">${formatP(crosshairData.open)}</strong></span>
              <span>H: <strong className="text-emerald-400">${formatP(crosshairData.high)}</strong></span>
              <span>L: <strong className="text-rose-400">${formatP(crosshairData.low)}</strong></span>
              <span>C: <strong className={crosshairData.close && crosshairData.open && crosshairData.close >= crosshairData.open ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                ${formatP(crosshairData.close)}
              </strong></span>
              <span className={`font-bold ${crosshairData.change && crosshairData.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                ({crosshairData.change && crosshairData.change >= 0 ? "+" : ""}{crosshairData.change?.toFixed(2)}%)
              </span>
            </>
          ) : (
            <span className="text-gray-400 flex items-center gap-1.5 text-[10px]">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              Hover crosshair over chart to inspect precise candle OHLC
            </span>
          )}
        </div>

        {/* Action Buttons: Timeframe, Zoom, Fullscreen */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-[#050811] p-0.5 rounded-lg border border-gray-800 text-[11px]">
            {(["1m", "3m", "5m", "15m", "1h"] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setIntervalState(tf)}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  interval === tf
                    ? "bg-emerald-500 text-gray-950 shadow"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Interactive Zoom Tools */}
          <div className="flex items-center gap-1 bg-[#050811] p-0.5 rounded-lg border border-gray-800">
            <button
              onClick={handleZoomIn}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
              title="Zoom In (Scroll Wheel also works)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
              title="Zoom Out (Scroll Wheel also works)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="px-2 py-1 rounded text-xs text-emerald-400 hover:text-white hover:bg-emerald-950/60 border border-emerald-500/30 transition cursor-pointer flex items-center gap-1 font-bold"
              title="Auto-Fit TP & SL into View"
            >
              <Target className="w-3.5 h-3.5" />
              Fit TP & SL
            </button>
          </div>

          {/* Expand / Collapse Height */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-[#050811] border border-gray-800 text-gray-400 hover:text-cyan-300 transition cursor-pointer"
            title={isExpanded ? "Compact View" : "Expand Full Chart"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 📊 TRADINGVIEW LIGHTWEIGHT CANVAS WITH FLOATING TP & SL TAGS */}
      <div className="relative w-full">
        {/* Floating TP, Entry & SL Overlay Badges */}
        <div className="absolute top-2 left-3 z-10 flex flex-wrap gap-2 pointer-events-none">
          {targetPrice > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-400 shadow-xl text-[11px] font-bold text-emerald-300 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>🎯 TP (Target): ${formatP(targetPrice)}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-mono font-bold">
                {type === "BUY" ? `+$${formatP(targetPrice - currentPrice)}` : `-$${formatP(currentPrice - targetPrice)}`}
              </span>
            </div>
          )}

          {entryPrice > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/90 border border-sky-400 shadow-xl text-[11px] font-bold text-sky-300 backdrop-blur-md">
              <span>⚡ Entry: ${formatP(entryPrice)}</span>
            </div>
          )}

          {stopLossPrice > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-400 shadow-xl text-[11px] font-bold text-rose-300 backdrop-blur-md">
              <Shield className="w-3.5 h-3.5 text-rose-400" />
              <span>🛑 SL (Stop Loss): ${formatP(stopLossPrice)}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-200 font-mono font-bold">
                {type === "BUY" ? `-$${formatP(currentPrice - stopLossPrice)}` : `+$${formatP(stopLossPrice - currentPrice)}`}
              </span>
            </div>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#070b12]/80 text-xs text-gray-400 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            Loading live TradingView candle feed...
          </div>
        )}
        <div
          ref={chartContainerRef}
          style={{ height: `${chartHeight}px` }}
          className="w-full cursor-crosshair"
        />
      </div>

      {/* 🧭 BOTTOM HUD: TARGET & STOP LOSS METRICS BAR */}
      <div className="p-2.5 bg-[#0a0f1d] border-t border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3 text-[11px] flex-wrap font-bold">
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            EMA 9
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            EMA 21
          </span>
          <span className="flex items-center gap-1.5 text-sky-400 bg-sky-950/50 px-2 py-0.5 rounded border border-sky-500/30">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            Entry: ${formatP(entryPrice)}
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            🎯 TP: ${formatP(targetPrice)}
          </span>
          <span className="flex items-center gap-1.5 text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-500/40">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            🛑 SL: ${formatP(stopLossPrice)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold">
            Target Gap: {distToTarget > 0 ? `+$${formatP(distToTarget)}` : "TARGET HIT! 🎯"}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-950 border border-rose-500/50 text-rose-300 font-bold">
            SL Buffer: ${formatP(distToSL)}
          </span>
        </div>
      </div>
    </div>
  );
};
