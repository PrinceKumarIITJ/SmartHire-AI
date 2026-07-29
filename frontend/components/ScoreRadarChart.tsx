"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

interface ScoreRadarChartProps {
  semanticScore: number;
  skillScore: number;
  experienceScore: number;
  projectScore: number;
  educationScore: number;
}

export default function ScoreRadarChart({
  semanticScore,
  skillScore,
  experienceScore,
  projectScore,
  educationScore,
}: ScoreRadarChartProps) {
  const data = [
    { subject: "Semantic Similarity", score: Math.round(semanticScore * 100), fullMark: 100 },
    { subject: "Skill Alignment", score: Math.round(skillScore * 100), fullMark: 100 },
    { subject: "Experience Target", score: Math.round(experienceScore * 100), fullMark: 100 },
    { subject: "Project Relevance", score: Math.round(projectScore * 100), fullMark: 100 },
    { subject: "Education Match", score: Math.round(educationScore * 100), fullMark: 100 },
  ];

  return (
    <div className="w-full h-48 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(255, 255, 255, 0.15)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Candidate"
            dataKey="score"
            stroke="#818cf8"
            fill="#6366f1"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
