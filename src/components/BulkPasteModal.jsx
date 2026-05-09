import { useState } from "react";
import { createPortal } from "react-dom";

export default function BulkPasteModal({
    open,
    onClose,
    columns = [],
    onSave,
}) {
    console.log("MODAL COLUMNS:", columns);

    const [rawText, setRawText] = useState("");
    const [parsedRows, setParsedRows] = useState([]);

    if (!open) return null;

    const parseClipboardData = () => {
        const lines = rawText
            .trim()
            .split("\n")
            .filter(Boolean);

        const parsed = lines.map((line) => {
            let cells = line.split("\t");

            if (cells.length === 1) {
                cells = line.split(/\s{2,}/);
            }
            const row = {};

            columns.forEach((col, index) => {
                row[col.name] = cells[index] || "";
            });

            return row;
        });
        console.log("COLUMNS:", columns);
        console.log("PARSED:", parsed);
        setParsedRows(parsed);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

            <div className="relative z-[10000] w-[95%] max-w-7xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#161616] p-6 shadow-2xl">


                {/* HEADER */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2xl font-semibold text-white">
                        Bulk Paste Records
                    </h2>

                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white text-xl"
                    >
                        ✕
                    </button>


                </div>

                {/* TEXTAREA */}
                <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    onPaste={(e) => {
                        const pasted = e.clipboardData.getData("text");

                        console.log("PASTED RAW:", pasted);

                        setRawText(pasted);
                    }}
                    placeholder="Paste Excel rows here..."
                    className="w-full h-52 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white outline-none"
                />

                {/* ACTIONS */}
                <div className="sticky top-0 z-10 flex gap-3 mt-4 bg-[#161616] py-3">

                    <button
                        onClick={parseClipboardData}
                        className="px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Preview
                    </button>

                    <button
                        onClick={() => {
                            setRawText("");
                            setParsedRows([]);
                        }}
                        className="px-5 py-2 rounded-xl bg-white/10 text-white"
                    >
                        Clear
                    </button>

                </div>


                {/* PREVIEW */}
                {parsedRows.length > 0 && (
                    <div className="mt-6 max-h-[400px] overflow-auto rounded-xl border border-white/10">

                        <table className="w-full text-sm text-left">

                            <thead className="sticky top-0 bg-[#1E1E1E]">
                                <tr>
                                    {columns.map((col) => (
                                        <th
                                            key={col.id}
                                            className="p-3 text-white/70"
                                        >
                                            {col.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {parsedRows.map((row, rowIndex) => (
                                    <tr
                                        key={rowIndex}
                                        className="border-t border-white/5"
                                    >
                                        {columns.map((col) => (
                                            <td
                                                key={col.id}
                                                className="p-3 text-white"
                                            >
                                                {row[col.name]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>
                )}

                {parsedRows.length > 0 && (
                    <div className="mt-5 flex justify-end">

                        <button
                            onClick={() => onSave(parsedRows)}
                            className="rounded-xl bg-green-600 px-6 py-3 text-white hover:bg-green-700"
                        >
                            Save {parsedRows.length} Records
                        </button>

                    </div>
                )}

            </div>

        </div>

        , document.body
    );
}
