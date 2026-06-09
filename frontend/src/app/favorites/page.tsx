"use client";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { api, StockGroup } from "@/lib/api";
import { useStore } from "@/stores/useStore";

export default function FavoritesPage() {
  const [groups, setGroups] = useState<StockGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const addToWatchlist = useStore((s) => s.addToWatchlist);

  const loadGroups = async () => {
    try {
      const { groups } = await api.groups.list();
      setGroups(groups);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadGroups(); }, []);

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    await api.groups.create(newGroupName.trim());
    setNewGroupName("");
    loadGroups();
  };

  const deleteGroup = async (id: number) => {
    if (!confirm("确定删除该分组？")) return;
    await api.groups.delete(id);
    loadGroups();
  };

  const removeStock = async (groupId: number, code: string) => {
    await api.groups.removeStock(groupId, code);
    loadGroups();
  };

  const loadGroupToWatchlist = (group: StockGroup) => {
    for (const stock of group.stocks.slice(0, 9)) {
      addToWatchlist(stock.stock_code, stock.stock_name);
    }
  };

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">收藏分组管理</h1>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createGroup()}
            placeholder="新建分组名称..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <button
            onClick={createGroup}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            创建
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-10">加载中...</p>
        ) : groups.length === 0 ? (
          <p className="text-gray-400 text-center py-10">暂无分组，请创建一个</p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                    <h3 className="font-bold text-lg dark:text-white">{group.name}</h3>
                    <span className="text-xs text-gray-400">({group.stocks.length}只)</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadGroupToWatchlist(group)}
                      className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      加载到看板
                    </button>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      删除分组
                    </button>
                  </div>
                </div>

                {group.stocks.length === 0 ? (
                  <p className="text-sm text-gray-400">暂无股票，从看板页面添加</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {group.stocks.map((stock) => (
                      <div
                        key={stock.stock_code}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm"
                      >
                        <span className="font-mono text-xs text-gray-500">{stock.stock_code}</span>
                        <span className="dark:text-white">{stock.stock_name}</span>
                        <button
                          onClick={() => removeStock(group.id, stock.stock_code)}
                          className="ml-1 text-gray-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
