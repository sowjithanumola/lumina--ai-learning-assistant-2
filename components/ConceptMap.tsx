import React, { useEffect, useRef } from 'react';
import {
  select,
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  drag as d3Drag,
  Simulation,
  SimulationNodeDatum
} from 'd3';
import { ConceptGraphData } from '../types';

interface ConceptMapProps {
  data: ConceptGraphData | null;
}

const ConceptMap: React.FC<ConceptMapProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const width = svgRef.current.clientWidth;
    const height = 400;

    const simulation = forceSimulation(data.nodes as SimulationNodeDatum[])
      .force("link", forceLink(data.links).id((d: any) => d.id).distance(100))
      .force("charge", forceManyBody().strength(-300))
      .force("center", forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", (d) => Math.sqrt(d.value));

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", (d) => d.val)
      .attr("fill", (d) => {
        if (d.group === 1) return "#ef4444";
        if (d.group === 2) return "#3b82f6";
        return "#10b981";
      })
      .call(drag(simulation) as any);

    node.append("title")
      .text((d) => d.id);

    const labels = svg.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(data.nodes)
      .enter()
      .append("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .style("pointer-events", "none")
      .text(d => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
        
      labels
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    function drag(simulation: Simulation<SimulationNodeDatum, undefined>) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3Drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

  }, [data]);

  if (!data) return null;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Concept Visualization</h3>
      <svg ref={svgRef} className="w-full h-[400px] bg-gray-50 rounded-lg"></svg>
    </div>
  );
};

export default ConceptMap;