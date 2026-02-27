import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, PageLayoutType } from '@grafana/data';
import {  LinkButton, useStyles2 } from '@grafana/ui';
import { PluginPage,getBackendSrv } from '@grafana/runtime';
import '../style/Contacts.css'
import { UsersTable } from '../components/appcomponents/UsersTable'
import {AddUser} from '../components/appcomponents/AddUser'
import { ROUTES } from '../constants';
import { prefixRoute } from 'utils/utils.routing';
import SearchBar from "../components/appcomponents/SearchBar"
function PageFive() {
  const s = useStyles2(getStyles);
  const [users, setUsers] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const getUsers = useCallback(async (pageNum: number,startStr: string =search) => {
  try {
    pageNum = pageNum? pageNum : 1
    const res = await getBackendSrv().get(
      `/api/plugins/main-noc-app/resources/users?page=${pageNum}&limit=${limit}&start=${startStr}`
    );
    setUsers(Array.isArray(res.data) ? res.data : []);
    setPage(res.page);
    setTotalPages(res.totalPages ?? 1);
    return res;
  } catch (err) {
    console.error('Failed to fetch users:', err);
    throw err;
  }
}, [limit]); // ✅ stable unless 'limit' changes

  const handleDelete = async (id: number) => {
    await getBackendSrv().delete(`/api/plugins/main-noc-app/resources/delete/user/${id}`);
    await getUsers(page,search); // refresh table
  };
  const handleAdd = async (userName: string, phoneNumber: string, team: string) => {
    try{
      const data = {
        username: userName,
        phonenumber: phoneNumber,
        team: team
      }
      const res = await getBackendSrv().post(`/api/plugins/main-noc-app/resources/user`,data);
      await getUsers(page,search);
     return res;
    } catch (err) {
      console.error('Failed to post new user:',err);
      throw err;
    }
  }
  useEffect(() => {
    getUsers(page,search);
  }, [page,search, getUsers]);
  const handleSearch = async (value: string) => {
    setSearch(value);       // save the value in state
    await getUsers(1, value);     // call your function with the current search string
  };
  const handleClick = () => {
    setIsVisible(!isVisible); // toggle true/false
  };
  return (
    <PluginPage layout={PageLayoutType.Canvas}>
        <div className={s.container}>
          <LinkButton href={prefixRoute(ROUTES.Main)}>
            to main page
          </LinkButton>
          <div className={s.content}>contacts</div>
          <div className={s.centered}>
            <button className={s.addUser} onClick={handleClick}> {!isVisible ? "add user" : "close"} </button>
          </div>
          <div>
          {isVisible &&<AddUser addNewUser={handleAdd}></AddUser>}
          </div>
          <div>
            <SearchBar onSearch={handleSearch} />
          </div>
          <div>
            <UsersTable users={users} page={page} totalPages={totalPages} currentSearch={search} onPageChange={(newPage: any) => getUsers(newPage,search)} onDelete={handleDelete} />
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
    padding: ${theme.spacing(3)};
    background-color: ${theme.colors.background.secondary};
    display: flex;
    justify-content: center;
  `,
  container: css`
    width: 100vw;
    max-width: 100%;
    heigh: 100vh;
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
  addUser: css `
    height: 20%;
    width:15%;
  `,
});

