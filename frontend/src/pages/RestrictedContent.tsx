import {FC, PropsWithChildren} from "react";
import {useWeb3} from "../hooks/useWeb3";
import {LandingPage} from "./LandingPage";

export const RestrictedContent: FC<PropsWithChildren> = (props) =>
    useWeb3().state.isConnected ?  props.children  : <LandingPage />

