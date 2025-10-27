"use client";
import React from "react";
import { Button } from "~/components/ui/button";

type Props = {
  facebookUrl?: string;
  instagramUrl?: string;
};

export function SocialButtons({ facebookUrl, instagramUrl }: Props) {
  const items = [
    { label: "Facebook", href: facebookUrl },
    { label: "Instagram", href: instagramUrl },
  ].filter((i): i is { label: string; href: string } => !!i.href);

  if (items.length === 0) return null;

  return (
    <div className="flex space-x-4">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          <Button
            size="sm"
            variant="outline"
            className="border-gray-600 bg-transparent text-gray-400 hover:bg-[#f8610e] hover:text-white"
          >
            {item.label}
          </Button>
        </a>
      ))}
    </div>
  );
}

