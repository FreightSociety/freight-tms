"use client";

import { useState, useTransition } from "react";
import { toggleBoardPost, setBoardStatus, setPostedRate } from "@/lib/actions/loadboard";
import { Select, Input, Button } from "@/components/ui/Form";
import { Badge } from "@/components/ui/Badge";
import { Td, Tr } from "@/components/ui/Table";
import { formatDate } from "@/lib/utils/format";
import { isLiveOnBoard } from "@/lib/utils/compute";
import type { LoadBoardPostRow, LoadRow } from "@/lib/db/schema";

export function BoardPostRow({ post }: { post: LoadBoardPostRow & { load: LoadRow | null } }) {
  const [pending, startTransition] = useTransition();
  const [rate, setRate] = useState(post.postedRate ?? "");
  const live = isLiveOnBoard(post);

  if (!post.load) return null;

  return (
    <Tr>
      <Td className="font-medium text-slate-900">{post.load.loadNumber}</Td>
      <Td>
        {post.load.originCity}, {post.load.originState} → {post.load.destCity}, {post.load.destState}
      </Td>
      <Td>{post.load.equipment || "—"}</Td>
      <Td>{post.load.loadedMiles}</Td>
      <Td>{formatDate(post.pickupDate)}</Td>
      <Td>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            step="0.01"
            className="w-24"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => startTransition(() => setPostedRate(post.id, Number(rate)))}
          >
            Set
          </Button>
        </div>
      </Td>
      <Td>
        <Select
          defaultValue={post.status}
          disabled={pending}
          onChange={(e) => startTransition(() => setBoardStatus(post.id, e.target.value as "OPEN" | "COVERED"))}
        >
          <option value="OPEN">Open</option>
          <option value="COVERED">Covered</option>
        </Select>
      </Td>
      <Td>
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input
            type="checkbox"
            defaultChecked={post.post}
            disabled={pending}
            className="rounded border-slate-300"
            onChange={(e) => startTransition(() => toggleBoardPost(post.id, e.target.checked))}
          />
          Post?
        </label>
      </Td>
      <Td>{live ? <Badge color="green">Live</Badge> : <Badge color="slate">Hidden</Badge>}</Td>
    </Tr>
  );
}
