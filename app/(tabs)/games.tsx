import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { useCoupleStore } from '../../stores/coupleStore';
import {
  useGameStore,
  QUIZ_QUESTIONS,
  WOULD_YOU_RATHER_PROMPTS,
  TRUTH_DARE_PROMPTS,
} from '../../stores/gameStore';
import { GameType } from '../../types';

export default function GamesScreen() {
  const { profile } = useAuthStore();
  const { couple, partner } = useCoupleStore();
  const {
    currentGameType,
    tictactoe,
    quiz,
    wouldYouRather,
    truthDare,
    setGameType,
    makeTicTacToeMove,
    resetTicTacToe,
    submitQuizAnswer,
    nextQuizQuestion,
    selectWouldYouRather,
    nextWouldYouRather,
    nextTruthDare,
    subscribeToGames,
    unsubscribeFromGames,
  } = useGameStore();

  const [quizInput, setQuizInput] = useState('');

  useEffect(() => {
    if (couple?.id && profile?.id) {
      subscribeToGames(couple.id, profile.id);
    }
    return () => unsubscribeFromGames();
  }, [couple?.id, profile?.id]);

  const gameTabs: { type: GameType; title: string; icon: string }[] = [
    { type: 'tictactoe', title: 'Tic-Tac-Toe', icon: '🎮' },
    { type: 'quiz', title: 'Love Quiz', icon: '💌' },
    { type: 'would_you_rather', title: 'Would You Rather', icon: '🤔' },
    { type: 'truth_dare', title: 'Truth or Dare', icon: '🔥' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Couple Games 🎮</Text>
        <Text style={styles.headerSub}>Play multiplayer games together in real time</Text>

        {/* Tab Switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {gameTabs.map((tab) => (
            <Pressable
              key={tab.type}
              onPress={() => setGameType(tab.type)}
              style={[
                styles.tabItem,
                currentGameType === tab.type && styles.tabItemActive,
              ]}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  currentGameType === tab.type && styles.tabLabelActive,
                ]}
              >
                {tab.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* GAME 1: TIC TAC TOE */}
        {currentGameType === 'tictactoe' && (
          <Card style={styles.gameCard}>
            <View style={styles.gameHeader}>
              <Text style={styles.gameTitle}>Tic-Tac-Toe</Text>
              <Badge
                label={
                  tictactoe.winner
                    ? tictactoe.winner === 'draw'
                      ? "It's a Draw! 🤝"
                      : `Winner: ${tictactoe.winner} 🎉`
                    : `Turn: ${tictactoe.turn}`
                }
                variant={tictactoe.winner ? 'gold' : 'lavender'}
              />
            </View>

            <Text style={styles.gameDescription}>
              Take turns placing hearts & stars on the board.
            </Text>

            {/* 3x3 Grid */}
            <View style={styles.gridContainer}>
              {tictactoe.board.map((cell, idx) => (
                <Pressable
                  key={idx}
                  disabled={!couple?.id || Boolean(cell) || Boolean(tictactoe.winner)}
                  onPress={() => profile?.id && couple?.id && makeTicTacToeMove(idx, profile.id, couple.id)}
                  style={[
                    styles.gridCell,
                    cell === 'X' && styles.cellX,
                    cell === 'O' && styles.cellO,
                  ]}
                >
                  <Text style={styles.cellText}>
                    {cell === 'X' ? '💖' : cell === 'O' ? '⭐' : ''}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Button
              title="New Round 🔄"
              variant="outline"
              style={{ marginTop: Spacing.md }}
              onPress={() => couple?.id && resetTicTacToe(couple.id)}
            />
          </Card>
        )}

        {/* GAME 2: LOVE QUIZ */}
        {currentGameType === 'quiz' && (
          <Card style={styles.gameCard}>
            <View style={styles.gameHeader}>
              <Text style={styles.gameTitle}>Love Quiz 💌</Text>
              <Badge label={`Question ${quiz.currentQuestionIndex + 1}/${QUIZ_QUESTIONS.length}`} />
            </View>

            <View style={styles.promptBox}>
              <Text style={styles.promptQuestion}>
                "{QUIZ_QUESTIONS[quiz.currentQuestionIndex]}"
              </Text>
            </View>

            {/* Answer Status */}
            <View style={styles.statusBox}>
              <Text style={styles.statusLabel}>
                {quiz.answers[profile?.id || ''] ? '✅ You submitted an answer' : '⏳ Awaiting your answer...'}
              </Text>
              <Text style={styles.statusLabel}>
                {partner?.id && quiz.answers[partner.id]
                  ? `✅ ${partner.displayName} submitted an answer`
                  : `⏳ Awaiting ${partner?.displayName || 'Partner'}...`}
              </Text>
            </View>

            {/* If revealed, show both answers */}
            {quiz.revealed ? (
              <View style={styles.revealBox}>
                <Text style={styles.revealHeading}>🎉 Both Answered!</Text>
                <Card variant="soft" style={styles.answerCard}>
                  <Text style={styles.answerAuthor}>Your answer:</Text>
                  <Text style={styles.answerText}>{quiz.answers[profile?.id || '']}</Text>
                </Card>
                {partner?.id && (
                  <Card variant="soft" style={styles.answerCard}>
                    <Text style={styles.answerAuthor}>{partner.displayName}'s answer:</Text>
                    <Text style={styles.answerText}>{quiz.answers[partner.id]}</Text>
                  </Card>
                )}
                <Button
                  title="Next Question ➡️"
                  style={{ marginTop: Spacing.md }}
                  onPress={() => couple?.id && nextQuizQuestion(couple.id)}
                />
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Type your secret answer here..."
                  placeholderTextColor={Colors.textMuted}
                  value={quizInput}
                  onChangeText={setQuizInput}
                  style={styles.textInput}
                />
                <Button
                  title="Submit Secret Answer 🔒"
                  disabled={!quizInput.trim() || Boolean(quiz.answers[profile?.id || ''])}
                  onPress={() => {
                    if (profile?.id && couple?.id && quizInput.trim()) {
                      submitQuizAnswer(quizInput.trim(), profile.id, couple.id);
                      setQuizInput('');
                    }
                  }}
                />
              </View>
            )}
          </Card>
        )}

        {/* GAME 3: WOULD YOU RATHER */}
        {currentGameType === 'would_you_rather' && (
          <Card style={styles.gameCard}>
            <View style={styles.gameHeader}>
              <Text style={styles.gameTitle}>Would You Rather? 🤔</Text>
              <Badge label={`Card ${wouldYouRather.currentPromptIndex + 1}`} variant="lavender" />
            </View>

            <Text style={styles.gameDescription}>
              Choose your favorite option. Once both partners pick, the choices are revealed!
            </Text>

            {/* Option A */}
            <Pressable
              disabled={Boolean(wouldYouRather.choices[profile?.id || ''])}
              onPress={() => profile?.id && couple?.id && selectWouldYouRather(1, profile.id, couple.id)}
              style={[
                styles.choiceCard,
                wouldYouRather.choices[profile?.id || ''] === 1 && styles.choiceSelected,
              ]}
            >
              <Text style={styles.choiceLetter}>A</Text>
              <Text style={styles.choiceText}>
                {WOULD_YOU_RATHER_PROMPTS[wouldYouRather.currentPromptIndex].optionA}
              </Text>
            </Pressable>

            {/* Option B */}
            <Pressable
              disabled={Boolean(wouldYouRather.choices[profile?.id || ''])}
              onPress={() => profile?.id && couple?.id && selectWouldYouRather(2, profile.id, couple.id)}
              style={[
                styles.choiceCard,
                wouldYouRather.choices[profile?.id || ''] === 2 && styles.choiceSelected,
              ]}
            >
              <Text style={styles.choiceLetter}>B</Text>
              <Text style={styles.choiceText}>
                {WOULD_YOU_RATHER_PROMPTS[wouldYouRather.currentPromptIndex].optionB}
              </Text>
            </Pressable>

            {wouldYouRather.revealed ? (
              <View style={styles.revealBox}>
                <Text style={styles.matchText}>
                  {wouldYouRather.choices[profile?.id || ''] === wouldYouRather.choices[partner?.id || '']
                    ? '✨ Perfect Match! You both chose the same! ❤️'
                    : 'Opposites attract! You chose different options! 😊'}
                </Text>
                <Button
                  title="Next Dilemma ➡️"
                  style={{ marginTop: Spacing.md }}
                  onPress={() => couple?.id && nextWouldYouRather(couple.id)}
                />
              </View>
            ) : (
              <Text style={styles.waitingNotice}>
                {wouldYouRather.choices[profile?.id || '']
                  ? `Waiting for ${partner?.displayName || 'partner'} to vote...`
                  : 'Tap an option to lock in your answer!'}
              </Text>
            )}
          </Card>
        )}

        {/* GAME 4: TRUTH OR DARE */}
        {currentGameType === 'truth_dare' && (
          <Card style={styles.gameCard}>
            <View style={styles.gameHeader}>
              <Text style={styles.gameTitle}>Truth or Dare 🔥</Text>
              <Badge label={truthDare.category.toUpperCase()} variant="gold" />
            </View>

            <View style={styles.categoryRow}>
              {(['romantic', 'truth', 'dare'] as const).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => profile?.id && couple?.id && nextTruthDare(cat, profile.id, couple.id)}
                  style={[
                    styles.catChip,
                    truthDare.category === cat && styles.catChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.catText,
                      truthDare.category === cat && styles.catTextActive,
                    ]}
                  >
                    {cat === 'romantic' ? '💖 Romantic' : cat === 'truth' ? '🔍 Truth' : '⚡ Dare'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.promptBox}>
              <Text style={styles.promptQuestion}>
                "{TRUTH_DARE_PROMPTS[truthDare.category][truthDare.promptIndex]}"
              </Text>
            </View>

            <View style={styles.truthButtons}>
              <Button
                title="Next Prompt 🎲"
                onPress={() => profile?.id && couple?.id && nextTruthDare(truthDare.category, profile.id, couple.id)}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textDark,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tabScroll: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    backgroundColor: Colors.background,
    marginRight: 8,
  },
  tabItemActive: {
    backgroundColor: Colors.primarySoft,
  },
  tabIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl + 40,
  },
  gameCard: {
    padding: Spacing.lg,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },
  gameDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 252,
    alignSelf: 'center',
    marginVertical: Spacing.md,
    backgroundColor: '#FFF0F5',
    padding: 6,
    borderRadius: Radii.lg,
  },
  gridCell: {
    width: 76,
    height: 76,
    margin: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  cellX: {
    backgroundColor: '#FFF5F8',
  },
  cellO: {
    backgroundColor: '#F5F0FF',
  },
  cellText: {
    fontSize: 32,
  },
  promptBox: {
    backgroundColor: '#FFF0F5',
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    marginVertical: Spacing.md,
    alignItems: 'center',
  },
  promptQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    textAlign: 'center',
    lineHeight: 24,
  },
  statusBox: {
    marginVertical: Spacing.sm,
    gap: 4,
  },
  statusLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  inputContainer: {
    marginTop: Spacing.sm,
    gap: 12,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.textDark,
  },
  revealBox: {
    marginTop: Spacing.md,
    gap: 8,
  },
  revealHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  answerCard: {
    padding: Spacing.sm + 4,
  },
  answerAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepPurple,
    marginBottom: 2,
  },
  answerText: {
    fontSize: 14,
    color: Colors.textDark,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginVertical: Spacing.xs + 2,
  },
  choiceSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF5F8',
  },
  choiceLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    marginRight: Spacing.md,
    width: 24,
  },
  choiceText: {
    fontSize: 14,
    color: Colors.textDark,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  matchText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.deepPurple,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  waitingNotice: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: Spacing.xs,
  },
  catChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radii.md,
  },
  catChipActive: {
    backgroundColor: Colors.primarySoft,
  },
  catText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  catTextActive: {
    color: Colors.primary,
  },
  truthButtons: {
    marginTop: Spacing.sm,
  },
});
