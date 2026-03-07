@property-based @NOSPEC
Feature: String Properties (Plugin Self-Test)
  As a plugin developer
  I want to verify that the property-based testing dialect works
  So that users can trust the two-phase execution model

  Scenario: Concatenation preserves both inputs
    Given any text <A>
    And any text <B>
    When <A> and <B> are concatenated producing <C>
    Then <C> includes <A>
    And <C> includes <B>

  Scenario: Concatenation length is sum of input lengths
    Given any text <A>
    And any text <B>
    When <A> and <B> are concatenated producing <C>
    Then <C> has length equal to sum of <A> and <B>

  Scenario: Different strings are distinguishable
    Given any non-empty text <X>
    And any non-empty text <Y>
    And <X> is not equal to <Y>
    Then <X> reversed is not always equal to <Y>

  @num-runs:200
  Scenario: Integer addition is commutative
    Given any integer <M>
    And any integer <N>
    When <M> and <N> are added producing <SUM1>
    And <N> and <M> are added producing <SUM2>
    Then <SUM1> is equal to <SUM2>
