import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { createSession } from "../lib/api";
import toast from "react-hot-toast";
import { BookOpen, Zap, ChevronRight, Search } from "lucide-react";

const TOPICS = [
  {
    name: "מבוא למחשבים",
    icon: "🔢",
    category: "Module 01",
    content: "בסיסים,המרה בין בסיסים (Binary / Decimal / Hex)",
  },
  {
    name: "מבנה המחשב",
    icon: "🧠",
    category: "Module 02",
    content: "זיכרון, CPU, IO  המחשות task manager",
  },
  {
    name: "OS",
    icon: "🖥️",
    category: "Module 03",
    content:
      "processes, memory, תפקידי מערכת ההפעלה: ניהול תהליכים | ניהול זיכרון | ניהול קבצים | ניהול התקני קלט/פלט דרייברים | ניהול משתמשים והרשאות | דוגמאות: Windows, Linux, macOS, Android | file system | bash",
  },
  {
    name: "תקשורת",
    icon: "🌐",
    category: "Module 04",
    content: "איך עובד האינטרנט, מודל שכבות, פרוטקולים",
  },
  {
    name: "Python basic",
    icon: "🐍",
    category: "Module 05",
    content:
      "Intro | Variables | Conditions | Loops | Functions basic | PEP8 | List",
  },
  {
    name: "Git",
    icon: "🌿",
    category: "Module 06",
    content:
      "Version Control | git init | git clone | git add | git commit | git status | git log | git diff | git branch | git checkout/switch | git merge | git rebase | git reset/revert | GitHub | Pull Request | Conflict Resolution | .gitignore | Team Workflow",
  },
  {
    name: "clean code",
    icon: "🧼",
    category: "Module 07",
    content:
      "Correct Naming | Small Functions | Single Responsibility | DRY | KISS | Separation of Concerns | Code Readability | Consistency | Comments | Refactoring | Folder Structure | Modular Code | Easy to Maintain",
  },
  {
    name: "debugging",
    icon: "🐞",
    category: "Module 08",
    content:
      "חשיבה וניתוח (Bug, Reproduce, Expected vs Actual, Root Cause, Isolation, Hypothesis) | כלים (Breakpoint, Step Into/Over, Debugger, Logging, Stack Trace) | סוגי שגיאות (Syntax Error, Runtime Error, Logical Error) | תהליך עבודה (Reproduce, Isolate, Fix, Verify)",
  },
  {
    name: "Python - Exceptions",
    icon: "⚠️",
    category: "Module 09",
    content: "raise,try,except,finally",
  },
  {
    name: "Python - Data Structures",
    icon: "🌲",
    category: "Module 10",
    content:
      "Mutable vs Immutable | list/tuple/set/dict | Ordered vs Unordered | Slicing & `slice()` | `is` vs `==` | `id()` | List Operations | Dict Operations | Add/Delete/Search/Sort/Copy/Iterate | String Manipulation | Filtering | Intersections | Unique Values | Min/Max | deep copy vs shallow copy",
  },
  {
    name: "Python - Scopes and Modules",
    icon: "📦",
    category: "Module 11",
    content:
      'LEGB Scopes | Mutable/Immutable | Default Arguments | `global` | `if __name__ == "__main__"` | Modules & Packages | `import / from / as` | `__init__.py` | `__all__` | `globals()/locals()/vars()` | Avoid `import *` | Circular Imports | Comprehensions | `reload()`',
  },
  {
    name: "Python - Functions",
    icon: "🛠️",
    category: "Module 12",
    content:
      "Pure Functions | Higher-Order Functions | Nested Functions | Enclosing | Nonlocal | `*args & **kwargs` | Lambda | Decorators",
  },
  {
    name: "Python - files",
    icon: "📁",
    category: "Module 13",
    content:
      "File Modes | open/close | with statement | read/readline/readlines | write/writelines | seek/teil | Text | JSON Files",
  },
  {
    name: "logs",
    icon: "📜",
    category: "Module 14",
    content:
      "Logging | Why Logs | info | warn | error | debug | Best Practices | Log Format | Save to File | Logger Libraries",
  },
  {
    name: "Python - Iterators and Generators",
    icon: "🔁",
    category: "Module 15",
    content:
      "Iterators | __iter__/__next__ | StopIteration | iter() | next() | Generators | yield | yield from | Generator Expressions | Lazy Evaluation | Infinite Sequences | itertools | Chaining Generators | Memory Efficiency | send() | throw() | close()",
  },
  {
    name: "Python - Classes and Inheritance",
    icon: "🏛️",
    category: "Module 16",
    content:
      "OOP Basics | `class/object` | Function vs Method | `self` | `__init__` | Instance vs Class Attributes | Objects without `__init__` | Dynamic Attributes | Inheritance | Polymorphism | Override | `isinstance/issubclass` | `type()`",
  },
  {
    name: "DB - SQL",
    icon: "🗄️",
    category: "Module 17",
    content:
      "select *, project, order by, filter and operators, row func, col func",
  },
  {
    name: "HTTP and Servers",
    icon: "🚀",
    category: "Module 18",
    content:
      "HTTP, FastAPI, HTTPS, DNS, client, server, curl, DB(MongoDB, PostgreSQL) venv",
  },
];

const DIFFICULTIES = [
  {
    value: "beginner",
    label: "Beginner",
    color: "bg-emerald-600",
    desc: "Just starting out",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    color: "bg-amber-500",
    desc: "Know the basics",
  },
  {
    value: "advanced",
    label: "Advanced",
    color: "bg-rose-600",
    desc: "Ready for a challenge",
  },
];

const QUESTION_COUNTS = [3, 5, 7, 10];

export default function Topics() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [count, setCount] = useState(5);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTopicDetailsOpen, setIsTopicDetailsOpen] = useState(false);

  const finalTopic = selected;
  const selectedTopic = TOPICS.find((t) => t.name === finalTopic);
  const selectedTopicContent = selectedTopic?.content
    ?.split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("  •  ");
  const filtered = TOPICS.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    setIsTopicDetailsOpen(false);
  }, [finalTopic]);

  const handleStart = async () => {
    if (!finalTopic) return toast.error("Please select or type a topic.");
    setLoading(true);
    try {
      const { data } = await createSession(finalTopic, difficulty);
      navigate("/session", {
        state: { session: data.session, topic: finalTopic, difficulty, count },
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to start session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="mb-2 shrink-0">
          <h1 className="text-2xl font-bold text-white mb-1.5">
            Choose a Topic
          </h1>
          <p className="text-slate-400">Pick what you want to practice today</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 lg:items-stretch">
          {/* Left: topic picker */}
          <div className="lg:col-span-2 space-y-4 lg:h-full flex flex-col min-h-0">
            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search topics..."
                className="w-full bg-dark-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500 transition"
              />
            </div>

            {/* Compact topic cards */}
            <div className="pr-1 flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2.5">
                {filtered.map((topic) => (
                  <button
                    key={topic.name}
                    onClick={() => {
                      setSelected(topic.name);
                    }}
                    className={`w-full flex items-start px-2.5 py-2 rounded-xl border text-left transition text-sm font-medium
                      ${
                        selected === topic.name
                          ? "bg-primary-600 border-primary-500 text-white"
                          : "bg-dark-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                      }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wider font-semibold opacity-75">
                        {topic.category}
                      </div>
                      <div className="leading-5 break-words text-[13px]">
                        {topic.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {!filtered.length && (
                <div className="text-sm text-slate-500 py-8 text-center">
                  No topics match your search.
                </div>
              )}
            </div>
          </div>

          {/* Right: settings panel */}
          <div className="space-y-4 h-full">
            <div className="bg-dark-800 rounded-2xl border border-slate-700 p-4 h-full flex flex-col overflow-y-auto">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Zap size={16} className="text-primary-400" /> Session Settings
              </h3>

              {/* Selected topic preview */}
              <div className="mb-4">
                <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1.5">
                  Topic
                </label>
                <div className="bg-dark-900 rounded-lg px-3 py-2.5 text-white min-h-[112px] border border-slate-800">
                  {finalTopic ? (
                    <>
                      <div className="text-sm font-medium leading-5">
                        {finalTopic}
                      </div>
                      {selectedTopicContent && (
                        <div className="mt-2">
                          <div
                            className={`text-xs leading-5 break-words whitespace-pre-wrap text-slate-300 ${
                              isTopicDetailsOpen ? "max-h-28 overflow-y-auto pr-1" : "max-h-10 overflow-hidden"
                            }`}
                          >
                            {selectedTopicContent}
                          </div>
                          {selectedTopicContent.length > 80 && (
                            <button
                              type="button"
                              onClick={() =>
                                setIsTopicDetailsOpen((open) => !open)
                              }
                              className="mt-1 text-[11px] font-medium text-primary-400 hover:text-primary-300 transition"
                            >
                              {isTopicDetailsOpen
                                ? "Show less"
                                : "Show full topic details"}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500">None selected</span>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-4">
                {/* Difficulty */}
                <div className="mb-3">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-2">
                    Difficulty
                  </label>
                  <div className="space-y-1.5">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setDifficulty(d.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition
                          ${
                            difficulty === d.value
                              ? "bg-dark-900 border-primary-500 text-white"
                              : "bg-dark-900 border-slate-700 text-slate-300 hover:border-slate-500"
                          }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${d.color}`} />
                        <div>
                          <div className="text-sm font-medium">{d.label}</div>
                          <div className="text-xs text-slate-500">{d.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question count */}
                <div className="mb-4">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-2">
                    Questions: <span className="text-primary-400">{count}</span>
                  </label>
                  <div className="flex gap-1.5">
                    {QUESTION_COUNTS.map((n) => (
                      <button
                        key={n}
                        onClick={() => setCount(n)}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition
                          ${
                            count === n
                              ? "bg-primary-600 border-primary-500 text-white"
                              : "bg-dark-900 border-slate-700 text-slate-400 hover:border-slate-500"
                          }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStart}
                  disabled={!finalTopic || loading}
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <BookOpen size={18} />
                      Start Session
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
