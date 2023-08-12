import React, {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import styles from "../../../styles/components/quests/quizzQuestion.module.css";

type ImageChoiceProps = {
  setSelected: Dispatch<SetStateAction<boolean>>;
  question: QuizQuestion;
};

const ImageChoice: FunctionComponent<ImageChoiceProps> = ({
  setSelected,
  question,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  useEffect(() => {
    if (selectedOptions.length > 0) setSelected(true);
    else setSelected(false);
  }, [selectedOptions]);
  return (
    <div className={`${styles.questionContainer} ${styles.full}`}>
      <div className={`${styles.tableLayout} ${styles.images} `}>
        {question.options.map((option, index) => (
          <div
            key={index}
            className={`${styles.checkBoxContainer} ${styles.checkboxImageContainer}`}
          >
            <input
              type="checkbox"
              name="option"
              id={option}
              onChange={() => {
                if (selectedOptions.includes(option))
                  setSelectedOptions(
                    selectedOptions.filter((item) => item !== option)
                  );
                else setSelectedOptions([...selectedOptions, option]);
              }}
              className={styles.checkbox}
              checked={selectedOptions.includes(option)}
            />
            <label className={styles.checkboxLabel} htmlFor={option}>
              <img src={option} className={styles.checkboxImage} />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageChoice;