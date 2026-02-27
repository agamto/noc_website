import React, { useState } from 'react';

type User = {
  id: number;
  username: string;
  team: string;
  phonenumber: string;
};

type Props = {
  users: User[];
  page: number;
  currentSearch: string;
  totalPages: number;
  onPageChange: (page: number,search: string) => void;
  onDelete: (id: number) => void;
};

export const UsersTable: React.FC<Props> = ({ users, onDelete,page, totalPages,currentSearch, onPageChange }) => {
  const [sortColumn, setSortColumn] = useState<keyof User | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: keyof User) => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortColumn) {return 0};
    const valA = a[sortColumn];
    const valB = b[sortColumn];
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
    return 0;
  });

  return (
    <div>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th
            style={{ border: '1px solid #ccc', padding: '8px', cursor: 'pointer' }}
            onClick={() => handleSort('username')}
          >
            Username {sortColumn === 'username' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
          </th>
          <th
            style={{ border: '1px solid #ccc', padding: '8px', cursor: 'pointer' }}
            onClick={() => handleSort('team')}
          >
            Team {sortColumn === 'team' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
          </th>
          <th
            style={{ border: '1px solid #ccc', padding: '8px', cursor: 'pointer' }}
            onClick={() => handleSort('phonenumber')}
          >
            Phone {sortColumn === 'phonenumber' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
          </th>
          <th style={{ border: '1px solid #ccc', padding: '8px' }}>Delete</th>
        </tr>
      </thead>
      <tbody>
        {(Array.isArray(sortedUsers) ? sortedUsers: []).map((user) => (
          <tr key={user.id}>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{user.username}</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{user.team}</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{user.phonenumber}</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>
              <button onClick={() => onDelete(user.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
     <div style={{ marginTop: "10px", display: "flex", gap: "5px" }}>
        <button onClick={() => onPageChange(page - 1,currentSearch)} disabled={page === 1}>
          Prev
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p,currentSearch)}
            style={{
              fontWeight: page === p ? "bold" : "normal",
              background: page === p ? "#ddd" : "",
            }}
          >
            {p}
          </button>
        ))}

        <button onClick={() => onPageChange(page + 1,currentSearch)} disabled={page === totalPages}>
          Next
        </button>
      </div>
    </div>
  );
};
