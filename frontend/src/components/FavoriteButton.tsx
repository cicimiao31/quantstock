"use client";
import { useEffect, useState } from "react";
import { api, StockGroup } from "@/lib/api";

interface Props {
  stockCode: string;
  stockName: string;
  size?: "sm" | "md";
}

export function FavoriteButton({ stockCode, stockName, size = "md" }: Props) {
  const [groups, setGroups] = useState<StockGroup[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    api.groups.list().then(({ groups }) => {
      setGroups(groups);
      const inAny = groups.some((g) => g.stocks.some((s) => s.stock_code === stockCode));
      setIsFavorited(inAny);
    }).catch(() => {});
  }, [stockCode]);

  const addToGroup = async (groupId: number) => {
    await api.groups.addStock(groupId, { stock_code: stockCode, stock_name: stockName });
    setIsFavorited(true);
    setShowMenu(false);
  };

  const removeFromAll = async () => {
    for (const g of groups) {
      if (g.stocks.some((s) => s.stock_code === stockCode)) {
        await api.groups.removeStock(g.id, stockCode);
      }
    }
    setIsFavorited(false);
    setShowMenu(false);
  };

  const btnClass = size === "sm"
    ? "px-2 py-0.5 text-xs rounded"
    : "px-3 py-1 text-sm rounded-md";

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }}
        className={`${btnClass} font-medium transition-colors ${
          isFavorited
            ? "bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700"
            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
        }`}
      >
        {isFavorited ? "★ 已收藏" : "☆ 收藏"}
      </button>

      {showMenu && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-[140px]"
          onClick={(e) => e.stopPropagation()}
        >
          {groups.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">暂无分组，请先创建</div>
          ) : (
            groups.map((g) => {
              const alreadyIn = g.stocks.some((s) => s.stock_code === stockCode);
              return (
                <button
                  key={g.id}
                  onClick={() => !alreadyIn && addToGroup(g.id)}
                  disabled={alreadyIn}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}
                  {alreadyIn && <span className="text-xs text-gray-400 ml-auto">已添加</span>}
                </button>
              );
            })
          )}
          {isFavorited && (
            <>
              <div className="border-t dark:border-gray-600 my-1" />
              <button
                onClick={removeFromAll}
                className="w-full px-3 py-1.5 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                取消收藏
              </button>
            </>
          )}
          <div className="border-t dark:border-gray-600 my-1" />
          <button
            onClick={() => setShowMenu(false)}
            className="w-full px-3 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}
