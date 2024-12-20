import { getCurrentUser } from "../common/authUtils";

const NoPage = () => {
    console.log(process.env);
    const user = getCurrentUser();
    return <h1>404 {process.env.APP_NAME} - {JSON.stringify(user)}</h1>;
  };
  
  export default NoPage;