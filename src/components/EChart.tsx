"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";

echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

interface EChartProps {
  option: EChartsOption;
  className?: string;
  onSliceHover?: (hovering: boolean) => void;
}

export default function EChart({ option, className = "w-full h-full", onSliceHover }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);
  const hoverRef = useRef(onSliceHover);

  useEffect(() => {
    hoverRef.current = onSliceHover;
  }, [onSliceHover]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = echarts.init(container, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    chart.on("mouseover", (event) => {
      if (event.componentType === "series") hoverRef.current?.(true);
    });
    chart.on("mouseout", () => hoverRef.current?.(false));
    chart.on("globalout", () => hoverRef.current?.(false));

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={containerRef} className={className} onMouseLeave={() => hoverRef.current?.(false)} />;
}
