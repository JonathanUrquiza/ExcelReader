'use client';

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

interface ExcelData {
  [key: string]: string | number | null;
}

const SELECT_COLUMNS = ['Criticality', 'CONTACTADO', 'STATI'];

type SortOrder = 'asc' | 'desc';

export default function ExcelUploader() {
  const [data, setData] = useState<ExcelData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<{ [key: string]: string | string[] }>({});
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError('');
      setIsLoading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          if (!event.target?.result) {
            throw new Error('No se pudo leer el archivo');
          }

          const workbook = XLSX.read(event.target.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<ExcelData>(worksheet);
          
          if (jsonData.length > 0) {
            setHeaders(Object.keys(jsonData[0]));
            setData(jsonData as ExcelData[]);
            setFilters({}); // Reset filters on new upload
            setSortBy(null);
            setSortOrder('asc');
          } else {
            setError('El archivo no contiene datos');
          }
        } catch (error) {
          console.error('Error al procesar el archivo:', error);
          setError('Error al procesar el archivo. Por favor, verifica que sea un archivo Excel válido.');
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        setError('Error al leer el archivo');
        setIsLoading(false);
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error general:', error);
      setError('Ocurrió un error inesperado');
      setIsLoading(false);
    }
  };

  // Obtener valores únicos para los select
  const uniqueValues = useMemo(() => {
    const values: { [key: string]: string[] } = {};
    SELECT_COLUMNS.forEach((col) => {
      values[col] = Array.from(new Set(data.map((row) => String(row[col] ?? '')))).filter(Boolean);
    });
    return values;
  }, [data]);

  // Filtrar los datos según los filtros activos
  const filteredData = useMemo(() => {
    return data.filter((row) =>
      headers.every((header) => {
        const filterValue = filters[header];
        if (!filterValue) return true;
        if (header === 'Criticality' && Array.isArray(filterValue)) {
          if (filterValue.length === 0) return true;
          return filterValue.includes(String(row[header] ?? ''));
        }
        return String(row[header] ?? '').toLowerCase().includes(String(filterValue).toLowerCase());
      })
    );
  }, [data, filters, headers]);

  // Ordenar los datos filtrados
  const sortedData = useMemo(() => {
    if (!sortBy) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const aValue = a[sortBy] ?? '';
      const bValue = b[sortBy] ?? '';
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return sortOrder === 'asc'
        ? String(aValue).localeCompare(String(bValue), undefined, { numeric: true })
        : String(bValue).localeCompare(String(aValue), undefined, { numeric: true });
    });
    return sorted;
  }, [filteredData, sortBy, sortOrder]);

  // Manejar cambios en los filtros
  const handleFilterChange = (header: string, value: string | string[]) => {
    setFilters((prev) => ({ ...prev, [header]: value }));
  };

  // Manejar cambios en el filtro de checkboxes de Criticality
  const handleCriticalityCheckbox = (value: string) => {
    setFilters((prev) => {
      const current = Array.isArray(prev['Criticality']) ? prev['Criticality'] : [];
      if (current.includes(value)) {
        // Quitar valor
        return { ...prev, Criticality: current.filter((v) => v !== value) };
      } else {
        // Agregar valor
        return { ...prev, Criticality: [...current, value] };
      }
    });
  };

  // Manejar clic en el encabezado para ordenar
  const handleSort = (header: string) => {
    if (sortBy === header) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(header);
      setSortOrder('asc');
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md text-gray-900 dark:text-gray-100">
      <div className="mb-4">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          disabled={isLoading}
          className="block w-full text-sm text-gray-500 dark:text-gray-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50
            dark:file:bg-blue-800 dark:file:text-blue-200 dark:hover:file:bg-blue-700"
        />
      </div>

      {isLoading && (
        <div className="mb-4 p-4 bg-blue-50 text-blue-700 rounded-lg dark:bg-blue-800 dark:text-blue-200">
          Procesando archivo...
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg dark:bg-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {data.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-4 items-end">
          {headers.map((header) => (
            <div key={header} className="flex flex-col">
              <label className="text-xs font-semibold mb-1">{header}</label>
              {header === 'Criticality' ? (
                <div className="flex flex-col gap-1 border rounded p-2 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                  {uniqueValues[header]?.map((val) => (
                    <label key={val} className="inline-flex items-center text-sm">
                      <input
                        type="checkbox"
                        className="mr-2 accent-blue-600 dark:accent-blue-400"
                        checked={Array.isArray(filters[header]) ? filters[header].includes(val) : false}
                        onChange={() => handleCriticalityCheckbox(val)}
                      />
                      {val}
                    </label>
                  ))}
                </div>
              ) : SELECT_COLUMNS.includes(header) ? (
                <select
                  className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  value={typeof filters[header] === 'string' ? filters[header] : ''}
                  onChange={(e) => handleFilterChange(header, e.target.value)}
                >
                  <option value="">Todos</option>
                  {uniqueValues[header]?.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder={`Filtrar ${header}`}
                  value={typeof filters[header] === 'string' ? filters[header] : ''}
                  onChange={(e) => handleFilterChange(header, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {sortedData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 dark:bg-gray-700 dark:border-gray-600">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-2 border-b bg-gray-50 cursor-pointer select-none hover:bg-blue-100 dark:bg-gray-600 dark:border-gray-500 dark:hover:bg-blue-700"
                    onClick={() => handleSort(header)}
                  >
                    {header}
                    {sortBy === header && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="even:bg-gray-50 dark:even:bg-gray-800">
                  {headers.map((header, colIndex) => (
                    <td key={colIndex} className="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                      {row[header]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.length > 0 && sortedData.length === 0 && (
        <div className="mt-4 text-center text-gray-500 dark:text-gray-400">No hay datos que coincidan con los filtros.</div>
      )}
    </div>
  );
} 