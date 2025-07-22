import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Column {
  key: string;
  label: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
}

export default function DataTable({ columns, data }: DataTableProps) {
  const formatCellValue = (value: any, key: string) => {
    if (value === null || value === undefined) {
      return '-';
    }

    // Format status badges
    if (key.includes('Status') || key === 'status') {
      const getStatusVariant = (status: string) => {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('paid') || statusLower.includes('fulfilled') || statusLower === 'active') {
          return 'default';
        }
        if (statusLower.includes('pending') || statusLower.includes('unfulfilled')) {
          return 'secondary';
        }
        if (statusLower.includes('cancelled') || statusLower.includes('archived')) {
          return 'destructive';
        }
        return 'outline';
      };

      return (
        <Badge variant={getStatusVariant(value)} className="text-xs">
          {value}
        </Badge>
      );
    }

    // Format numbers
    if (typeof value === 'number') {
      return value.toLocaleString();
    }

    // Format strings
    if (typeof value === 'string') {
      // Truncate long strings
      if (value.length > 50) {
        return value.substring(0, 47) + '...';
      }
      return value;
    }

    return String(value);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className="font-semibold">
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={row.id || index} className="hover:bg-muted/50">
              {columns.map((column) => (
                <TableCell key={column.key} className="py-3">
                  {formatCellValue(row[column.key], column.key)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}