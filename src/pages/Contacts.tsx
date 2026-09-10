import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, PageLayoutType } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { PluginPage,getBackendSrv } from '@grafana/runtime';
import '../style/Contacts.css'
import { UsersTable } from '../components/appcomponents/UsersTable'
import {AddUser} from '../components/appcomponents/AddUser'
import { AppPageHeader } from '../components/AppPageHeader';
import { BackToMainLink } from '../components/BackToMainLink';
function PageFive() {
  const s = useStyles2(getStyles);
  const [users, setUsers] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [teams, setTeams] = useState<string[]>([]);
  const [usernames, setUsernames] = useState<string[]>([]);

  const getUsers = useCallback(async (pageNum: number,startStr ="", team = "") => {
  try {
    pageNum = pageNum? pageNum : 1
    const query = new URLSearchParams({
      page: String(pageNum),
      limit: String(limit),
      start: startStr,
      team,
    });
    const res = await getBackendSrv().get(
      `/api/plugins/main-noc-app/resources/users?${query}`
    );
    setUsers(Array.isArray(res.data) ? res.data : []);
    setPage(res.page);
    setTotalUsers(res.total ?? 0);
    setTotalPages(res.totalPages ?? 1);
    return res;
  } catch (err) {
    console.error('Failed to fetch users:', err);
    throw err;
  }
}, [limit]); // ✅ stable unless 'limit' changes

  const getTeams = useCallback(async () => {
    try {
      const response = await getBackendSrv().get('/api/plugins/main-noc-app/resources/teams');
      setTeams(Array.isArray(response) ? response : response.data ?? []);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  }, []);

  const getUsernames = useCallback(async () => {
    try {
      const response = await getBackendSrv().get('/api/plugins/main-noc-app/resources/usernames');
      setUsernames(Array.isArray(response) ? response : response.data ?? []);
    } catch (err) {
      console.error('Failed to fetch usernames:', err);
    }
  }, []);

  const handleDelete = async (id: number) => {
    await getBackendSrv().delete(`/api/plugins/main-noc-app/resources/delete/user/${id}`);
    await Promise.all([getUsers(page,search, teamFilter), getTeams(), getUsernames()]); // refresh table and suggestions
  };
  const handleAdd = async (userName: string, phoneNumber: string, team: string) => {
    try{
      const data = {
        username: userName,
        phonenumber: phoneNumber,
        team: team
      }
      const res = await getBackendSrv().post(`/api/plugins/main-noc-app/resources/user`,data);
      await Promise.all([getUsers(page,search, teamFilter), getTeams(), getUsernames()]);
     return res;
    } catch (err) {
      console.error('Failed to post new user:',err);
      throw err;
    }
  }
  const handleUpdate = async (id: number, userName: string, phoneNumber: string, team: string) => {
    await getBackendSrv().put(`/api/plugins/main-noc-app/resources/user/${id}`, {
      username: userName,
      phonenumber: phoneNumber,
      team,
    });
    await Promise.all([getUsers(page, search, teamFilter), getTeams(), getUsernames()]);
  };
  useEffect(() => {
    getUsers(page,search, teamFilter);
  }, [page,search, teamFilter, getUsers]);

  useEffect(() => {
    getTeams();
  }, [getTeams]);
  useEffect(() => {
    getUsernames();
  }, [getUsernames]);
  const handleSearch = async (value: string) => {
    setSearch(value);       // save the value in state
    await getUsers(1, value, teamFilter);     // call your function with the current search string
  };
  const handleTeamFilterChange = (value: string) => {
    setPage(1);
    setTeamFilter(value);
  };
  const handleClick = () => {
    setIsVisible(!isVisible); // toggle true/false
  };
  return (
    <PluginPage layout={PageLayoutType.Canvas}>
        <div className={s.container}>
        <AppPageHeader>
          <BackToMainLink />
        </AppPageHeader>
          <div className={s.content}>contacts</div>
          <div className={s.centered}>
            <button title={!isVisible ? "add user" : "close"} className="add-user-toggle" onClick={handleClick}> {!isVisible ? "add user" : "close"} </button>
          </div>
          <div>
          {isVisible &&<AddUser addNewUser={handleAdd}></AddUser>}
          </div>
          <div>
            <UsersTable users={users} page={page} totalUsers={totalUsers} totalPages={totalPages} usernames={usernames} teams={teams} userFilter={search} teamFilter={teamFilter} onUserFilterChange={handleSearch} onTeamFilterChange={handleTeamFilterChange} onPageChange={(newPage) => getUsers(newPage, search, teamFilter)} onDelete={handleDelete} onUpdate={handleUpdate} />
          </div>
        </div>
    </PluginPage>
  );
}
export default PageFive;

const getStyles = (theme: GrafanaTheme2) => ({
  marginBottom: css`
    margin-bottom: ${theme.spacing(10)};
  `,
  page: css`
    padding: ${theme.spacing(10)} ${theme.spacing(3)} ${theme.spacing(3)};
    background-color: ${theme.colors.background.secondary};
    display: flex;
    justify-content: center;
  `,
  container: css`
    width: 100vw;
    max-width: 100%;
    heigh: 100vh;
  `,
  backButton: css`
      position: absolute;
      top: ${theme.spacing(2)};
      left: ${theme.spacing(2)};
  `,
  content: css`
    margin-bottom: ${theme.spacing(5)};
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 25px;
  `,
  centered: css`
    margin-bottom: ${theme.spacing(5)};
    display:flex;
    justify-content: center;
    align-items: center;
  `,
});

