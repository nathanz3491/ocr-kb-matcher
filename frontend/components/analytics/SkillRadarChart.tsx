'use client';

import { useState, useEffect } from 'react';

interface SkillData {
  skill: string;
  score: number;
  maxScore: number;
  color: string;
}

const mockSkillData: SkillData[] = [
  { skill: 'Algebra', score: 85, maxScore: 100, color: '#3B82F6' },
  { skill: 'Geometry', score: 72, maxScore: 100, color: '#8B5CF6' },
  { skill: 'Calculus', score: 45, maxScore: 100, color: '#EC4899' },
  { skill: 'Statistics', score: 68, maxScore: 100, color: '#10B981' },
  { skill: 'Number Theory', score: 90, maxScore: 100, color: '#F59E0B' },
  { skill: 'Logic', score: 78, maxScore: 100, color: '#EF4444' },
];

export function SkillRadarChart() {
  const [skills, setSkills] = useState<SkillData[]>(mockSkillData);
  const [hoveredSkill, setHoveredSkill] = useState<SkillData | null>(null);

  // Calculate positions for radar chart
  const centerX = 150;
  const centerY = 150;
  const radius = 100;
  const totalSkills = skills.length;
  
  const getPointPosition = (index: number, value: number, maxValue: number) => {
    const angle = (Math.PI * 2 * index) / totalSkills - Math.PI / 2;
    const distance = (value / maxValue) * radius;
    return {
      x: centerX + distance * Math.cos(angle),
      y: centerY + distance * Math.sin(angle),
    };
  };

  // Generate polygon points for the skill area
  const polygonPoints = skills
    .map((skill, idx) => {
      const pos = getPointPosition(idx, skill.score, skill.maxScore);
      return `${pos.x},${pos.y}`;
    })
    .join(' ');

  // Generate background grid circles
  const gridLevels = [25, 50, 75, 100];
  const gridCircles = gridLevels.map(level => {
    const r = (level / 100) * radius;
    return (
      <circle
        key={level}
        cx={centerX}
        cy={centerY}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.1}
        className="text-slate-400 dark:text-slate-500"
      />
    );
  });

  // Generate axis lines and labels
  const axisLines = skills.map((skill, idx) => {
    const pos = getPointPosition(idx, skill.maxScore, skill.maxScore);
    const angle = (Math.PI * 2 * idx) / totalSkills - Math.PI / 2;
    const labelRadius = radius + 25;
    const labelX = centerX + labelRadius * Math.cos(angle);
    const labelY = centerY + labelRadius * Math.sin(angle);
    
    return (
      <g key={skill.skill}>
        <line
          x1={centerX}
          y1={centerY}
          x2={pos.x}
          y2={pos.y}
          stroke="currentColor"
          strokeOpacity={0.2}
          className="text-slate-400 dark:text-slate-500"
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-600 dark:fill-slate-300 text-xs font-medium"
        >
          {skill.skill}
        </text>
      </g>
    );
  });

  // Data points
  const dataPoints = skills.map((skill, idx) => {
    const pos = getPointPosition(idx, skill.score, skill.maxScore);
    return (
      <g key={skill.skill}>
        <circle
          cx={pos.x}
          cy={pos.y}
          r={6}
          fill={skill.color}
          className="cursor-pointer transition-all hover:r-8"
          onMouseEnter={() => setHoveredSkill(skill)}
          onMouseLeave={() => setHoveredSkill(null)}
        />
      </g>
    );
  });

  // Calculate average score
  const avgScore = Math.round(skills.reduce((sum, s) => sum + s.score, 0) / skills.length);

  return (
    <div className="rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 p-6 shadow-lg dark:shadow-slate-900/30 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Skill Radar</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Subject proficiency overview</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avgScore}%</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Average</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Radar Chart SVG */}
        <div className="relative">
          <svg width="320" height="320" viewBox="0 0 300 300">
            {/* Grid circles */}
            {gridCircles}
            {/* Axis lines and labels */}
            {axisLines}
            {/* Skill area polygon */}
            <polygon
              points={polygonPoints}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth="2"
            />
            {/* Data points */}
            {dataPoints}
          </svg>

          {/* Hover tooltip */}
          {hoveredSkill && (
            <div className="absolute left-full ml-4 top-0 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white dark:bg-slate-700">
              <div className="font-medium">{hoveredSkill.skill}</div>
              <div className="text-slate-300">{hoveredSkill.score}/{hoveredSkill.maxScore}</div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {skills.map(skill => (
            <div
              key={skill.skill}
              className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 px-3 py-2"
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: skill.color }}
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {skill.skill}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {skill.score}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}