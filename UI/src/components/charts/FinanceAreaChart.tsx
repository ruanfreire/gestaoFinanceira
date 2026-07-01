import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import type { FinanceChartSeries } from "./FinanceBarChart";

type FinanceAreaChartProps = {
  categories: string[];
  series: FinanceChartSeries[];
  height?: number;
  valueFormatter?: (value: number) => string;
  colors?: string[];
};

export default function FinanceAreaChart({
  categories,
  series,
  height = 300,
  valueFormatter = (val) => String(val),
  colors = ["#465FFF", "#9CB9FF"],
}: FinanceAreaChartProps) {
  const options: ApexOptions = {
    legend: {
      show: series.length > 1,
      position: "top",
      horizontalAlign: "left",
    },
    colors,
    chart: {
      fontFamily: "Outfit, sans-serif",
      height,
      type: "area",
      toolbar: { show: false },
      width: "100%",
    },
    stroke: {
      curve: "smooth",
      width: series.map(() => 2),
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.45,
        opacityTo: 0.05,
      },
    },
    markers: {
      size: 0,
      hover: { size: 5 },
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      y: { formatter: (val) => valueFormatter(Number(val)) },
    },
    xaxis: {
      type: "category",
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val) => valueFormatter(Number(val)),
      },
    },
  };

  return (
    <div className="w-full min-w-0">
      <Chart options={options} series={series} type="area" height={height} width="100%" />
    </div>
  );
}
