import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

export type FinanceChartSeries = {
  name: string;
  data: number[];
};

type FinanceBarChartProps = {
  categories: string[];
  series: FinanceChartSeries[];
  height?: number;
  valueFormatter?: (value: number) => string;
  colors?: string[];
};

export default function FinanceBarChart({
  categories,
  series,
  height = 280,
  valueFormatter = (val) => String(val),
  colors = ["#465fff", "#9CB9FF"],
}: FinanceBarChartProps) {
  const options: ApexOptions = {
    colors,
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "45%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    legend: {
      show: series.length > 1,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    yaxis: {
      labels: {
        formatter: (val) => valueFormatter(Number(val)),
      },
    },
    grid: {
      yaxis: { lines: { show: true } },
    },
    fill: { opacity: 1 },
    tooltip: {
      y: { formatter: (val) => valueFormatter(Number(val)) },
    },
  };

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div className="min-w-[640px]">
        <Chart options={options} series={series} type="bar" height={height} />
      </div>
    </div>
  );
}
