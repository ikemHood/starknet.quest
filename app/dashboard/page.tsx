"use client";

import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import styles from "@styles/dashboard.module.css";
import { useAccount, useStarkName } from "@starknet-react/core";
import { usePathname, useRouter } from "next/navigation";
import { useDebounce } from "@hooks/useDebounce";
import { StarknetIdJsContext } from "@context/StarknetIdJsProvider";
import Blur from "@components/shapes/blur";
import DashboardSkeleton from "@components/skeletons/dashboardSkeleton";
import { isHexString, minifyAddress } from "@utils/stringService";
import useCreationDate from "@hooks/useCreationDate";
import { utils } from "starknetid.js";
import { decimalToHex, hexToDecimal } from "@utils/feltService";
import ProfileCard from "@components/UI/profileCard/profileCard";
import { LeaderboardTopperParams, fetchLeaderboardToppers, getBoostById, getBoosts, getCompletedQuests, getQuestById } from "@services/apiService";
import { calculatePercentile } from "@utils/numberService";
import { getDomainFromAddress } from "@utils/domainService";
import BoostCard from "@components/quest-boost/boostCard";
import { QuestDocument } from "../../types/backTypes";


type DashboardProps = {
  params: {
    addressOrDomain: string;
  };
  questData: {
    ranking: { address: string; xp: number; achievements: number }[];
  } | undefined;
};

export default function Page({ params, questData }: DashboardProps) {
  const router = useRouter();
  const [identity, setIdentity] = useState<Identity>();
  const addressOrDomain = params.addressOrDomain;
  const sinceDate = useCreationDate(identity);
  const [achievements, setAchievements] = useState<BuildingsInfo[]>([]);
  const [initProfile, setInitProfile] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const dynamicRoute = usePathname();
  const { address } = useAccount();
  const [userPercentile, setUserPercentile] = useState<number>();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchAddress = useDebounce<string>(searchQuery, 200);
  const { starknetIdNavigator } = useContext(StarknetIdJsContext);
  const [loading, setLoading] = useState<boolean>(false);
  const [displayData, setDisplayData] = useState([]);
  const [completedQuests, setCompletedQuests] = useState<QuestDocument[]>([]);
  const [numOfCompletedQuests, setNumOfCompletedQuests] = useState<number[]>([]);
  const [quests, setQuests] = useState<QuestDocument[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);


  useEffect(() => setNotFound(false), [dynamicRoute]);


  useEffect(() => {
    setInitProfile(false);
    setAchievements([]);
  }, [address, addressOrDomain]); 

  useEffect(() => {
    if (!address) setIsOwner(false);
  }, [address]);

  useEffect(() => {
    if (
      typeof addressOrDomain === "string" &&
      addressOrDomain?.toString().toLowerCase().endsWith(".stark")
    ) {
      if (
        !utils.isBraavosSubdomain(addressOrDomain) &&
        !utils.isXplorerSubdomain(addressOrDomain)
      ) {
        starknetIdNavigator
          ?.getStarknetId(addressOrDomain)
          .then((id) => {
            getIdentityData(id).then((data: Identity) => {
              if (data.error) {
                setNotFound(true);
                return;
              }
              setIdentity({
                ...data,
                starknet_id: id.toString(),
              });
              if (hexToDecimal(address) === hexToDecimal(data.addr))
                setIsOwner(true);
              setInitProfile(true);
            });
          })
          .catch(() => {
            return;
          });
      } else {
        starknetIdNavigator
          ?.getAddressFromStarkName(addressOrDomain)
          .then((addr) => {
            setIdentity({
              starknet_id: "0",
              addr: addr,
              domain: addressOrDomain,
              is_owner_main: false,
            });
            setInitProfile(true);
            if (hexToDecimal(address) === hexToDecimal(addr)) setIsOwner(true);
          })
          .catch(() => {
            return;
          });
      }
    } else if (
      typeof addressOrDomain === "string" &&
      isHexString(addressOrDomain)
    ) {
      starknetIdNavigator
        ?.getStarkName(hexToDecimal(addressOrDomain))
        .then((name) => {
          if (name) {
            if (
              !utils.isBraavosSubdomain(name) &&
              !utils.isXplorerSubdomain(name)
            ) {
              starknetIdNavigator
                ?.getStarknetId(name)
                .then((id) => {
                  getIdentityData(id).then((data: Identity) => {
                    if (data.error) return;
                    setIdentity({
                      ...data,
                      starknet_id: id.toString(),
                    });
                    if (hexToDecimal(address) === hexToDecimal(data.addr))
                      setIsOwner(true);
                    setInitProfile(true);
                  });
                })
                .catch(() => {
                  return;
                });
            } else {
              setIdentity({
                starknet_id: "0",
                addr: addressOrDomain,
                domain: name,
                is_owner_main: false,
              });
              setInitProfile(true);
              if (hexToDecimal(addressOrDomain) === hexToDecimal(address))
                setIsOwner(true);
            }
          } else {
            setIdentity({
              starknet_id: "0",
              addr: addressOrDomain,
              domain: minifyAddress(addressOrDomain),
              is_owner_main: false,
            });
            setIsOwner(false);
            setInitProfile(true);
          }
        })
        .catch(() => {
          setIdentity({
            starknet_id: "0",
            addr: addressOrDomain,
            domain: minifyAddress(addressOrDomain),
            is_owner_main: false,
          });
          setInitProfile(true);
          if (hexToDecimal(addressOrDomain) === hexToDecimal(address))
            setIsOwner(true);
        });
    } else {
      setNotFound(true);
    }
  }, [addressOrDomain, address]);

  const getIdentityData = async (id: string) => { 
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STARKNET_ID_API_LINK}/id_to_data?id=${id}`
    );
    return response.json();
  };


  const fetchLeaderboardToppersResult = useCallback( 
    async (requestBody: LeaderboardTopperParams) => {
      const topperData = await fetchLeaderboardToppers(requestBody);
      setLeaderboardToppers(topperData);
    },
    []
  );


  const [leaderboardToppers, setLeaderboardToppers] = 
    useState<LeaderboardToppersData>({
      best_users: [],
      total_users: 0,
  });

  useEffect(() => {
    const fetchCompletedQuests = async () => {
      try {
        const res = await getCompletedQuests(address ? address : "");
        setNumOfCompletedQuests(res);

        const updatedQuests = await Promise.all(res.map((id:number) => getQuestById(id)));
        const questsToUpdate = Array.isArray(updatedQuests) ? updatedQuests : [updatedQuests];
        setQuests(prevQuests => [...prevQuests, ...questsToUpdate]);
      
        const updatedBoosts = await Promise.any(res.map((id:number) => getBoostById(id.toString()))); 
        const boostsToUpdate = Array.isArray(updatedBoosts) ? updatedBoosts : [updatedBoosts];
        setBoosts(prevBoosts => [...prevBoosts, ...boostsToUpdate])
      } catch (err) {
        console.log("Error while fetching quests", err);
      }
    };

    fetchCompletedQuests();
  }, [address]);


  // calculate user percentile
  useEffect(() => {
    const res = calculatePercentile(
      leaderboardToppers?.position ?? 0,
      leaderboardToppers?.total_users ?? 0
    );
    setUserPercentile(res);
  }, [leaderboardToppers]);

  return (
    <div className={styles.dashboard_container}>
      {loading ? (
        <div className={styles.dashboard_skeleton}>
          <DashboardSkeleton />
        </div>
      ) : (
        <>
        <div className={styles.dashboard_wrapper}>
            <div className={styles.blur1}>
              <Blur green />
            </div>
            <div className={styles.blur2}>
              <Blur green />
            </div>

            {/* Profile Card */}
            {identity ? <ProfileCard identity={identity} addressOrDomain={addressOrDomain} sinceDate={sinceDate} userPercentile={userPercentile ? userPercentile : 0} data={questData} /> : <div className={styles.dashboard_profile_card}>Fetching data...</div> }
      
        </div>

        {/* Completed Quests */}
        <div className={styles.dashboard_completed_tasks_container}>
            <div className={styles.second_header_label}>
                <h2 className={styles.second_header}>Quests Completed</h2>
            </div>
            
            <div className={styles.quests_container}>
              
                {quests?.map((quest) => {
                  return (
                    <BoostCard
                      key={quest.id}
                      boost={boosts[quest.id]}
                      completedQuests={numOfCompletedQuests}
                    />
                  );
                })}
                  {quests?.length === 0 && (
                    <h2 className={styles.noBoosts}>
                      No completed quests at the moment.
                    </h2>
                  )}
                
            </div>
            
        </div>
          
        </>
      )}
    </div>
  );
}