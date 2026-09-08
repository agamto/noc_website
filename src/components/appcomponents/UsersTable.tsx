import React, { useState } from 'react';
import './UsersTable.css';

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
  onPageChange: (page: number, search: string) => void;
  onDelete: (id: number) => void;
  onUpdate: (
    id: number,
    userName: string,
    phoneNumber: string,
    team: string
  ) => Promise<void>;
};

export const UsersTable: React.FC<Props> = ({
  users,
  onDelete,
  onUpdate,
  page,
  totalPages,
  currentSearch,
  onPageChange,
}) => {
  const [sortColumn, setSortColumn] = useState<keyof User | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSort = (column: keyof User) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortColumn) {return 0;}

    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    }

    return 0;
  });

  const handleSave = async () => {
    if (!editingUser) {return;}

    setSaving(true);

    try {
      await onUpdate(
        editingUser.id,
        editingUser.username,
        editingUser.phonenumber,
        editingUser.team
      );

      setEditingUser(null);
    } finally {
      setSaving(false);
    }
  };

  const sortIcon = (column: keyof User) => {
    if (sortColumn !== column) {return '↕';}
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="users-page">
      <div className="users-card">

        {/* Header */}
        <div className="users-header">
          <div>
            <h2>Users</h2>
            <p>Manage your users and teams</p>
          </div>

          <span className="user-count">
            {users.length} users
          </span>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('username')}>
                  Username
                  <span>{sortIcon('username')}</span>
                </th>

                <th onClick={() => handleSort('team')}>
                  Team
                  <span>{sortIcon('team')}</span>
                </th>

                <th onClick={() => handleSort('phonenumber')}>
                  Phone
                  <span>{sortIcon('phonenumber')}</span>
                </th>

                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <div className="empty-icon">👥</div>
                      <h3>No users found</h3>
                      <p>Try changing your search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => {
                  const isEditing = editingUser?.id === user.id;

                  return (
                    <tr key={user.id}>

                      {/* Username */}
                      <td>
                        {isEditing ? (
                          <input
                            className="edit-input" aria-label={`Edit username for user ${user.id}`}
                            value={editingUser.username}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                username: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <div className="username">
                            <div className="avatar">
                              {user.username.charAt(0).toUpperCase()}
                            </div>

                            {user.username}
                          </div>
                        )}
                      </td>

                      {/* Team */}
                      <td>
                        {isEditing ? (
                          <input
                            className="edit-input"
                            value={editingUser.team}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                team: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <span className="team-badge">
                            {user.team}
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td>
                        {isEditing ? (
                          <input
                            className="edit-input"
                            value={editingUser.phonenumber}
                            onChange={(e) =>
                              setEditingUser({
                                ...editingUser,
                                phonenumber: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <span className="phone">
                            {user.phonenumber}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="actions">
                          {isEditing ? (
                            <>
                              <button
                                className="btn btn-save"
                                onClick={handleSave}
                                disabled={saving}
                              >
                                {saving ? 'Saving...' : '✓ Save'}
                              </button>

                              <button
                                className="btn btn-cancel"
                                onClick={() => setEditingUser(null)}
                                disabled={saving}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-edit"
                                onClick={() => setEditingUser(user)}
                              >
                                ✎ Edit
                              </button>

                              <button
                                className="btn btn-delete"
                                onClick={() => onDelete(user.id)}
                              >
                                🗑 Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>

          <div className="pagination-buttons">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() =>
                onPageChange(page - 1, currentSearch)
              }
            >
              ←
            </button>

            {Array.from(
              { length: totalPages },
              (_, i) => i + 1
            ).map((p) => (
              <button
                key={p}
                className={`page-btn ${
                  page === p ? 'active' : ''
                }`}
                onClick={() =>
                  onPageChange(p, currentSearch)
                }
              >
                {p}
              </button>
            ))}

            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() =>
                onPageChange(page + 1, currentSearch)
              }
            >
              →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
